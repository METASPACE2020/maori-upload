import os
from os.path import dirname, exists, isdir, join, splitext
import base64
import hmac
import hashlib
import json
import boto3
from collections import defaultdict
import tempfile

import tornado.ioloop
import tornado.web

from notify import post_to_slack

TMP_STORAGE_PATH = "/tmp"
METADATA_FILE_NAME = "meta.json"
BUCKET = 'sm-engine-upload'

s3 = boto3.resource('s3', os.getenv('AWS_REGION'))
data_store = defaultdict(dict)


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render('static/index.html')


def new_json_file(session_id):
    dir_path = get_dataset_path(session_id)
    file_path = join(dir_path, METADATA_FILE_NAME)
    return open(file_path, 'wb')


def get_dataset_path(session_id):
    return join(TMP_STORAGE_PATH, session_id)


def prepare_directory(session_id):
    dir_path = get_dataset_path(session_id)
    if not isdir(dir_path):
        os.mkdir(dir_path)


class SubmitHandler(tornado.web.RequestHandler):

    def initialize(self, data):
        self.data = data

    def upload_metadata_s3(self, local, dest):
        obj = s3.Object(BUCKET, dest)
        obj.upload_file(local)

    def post(self):
        if self.request.headers["Content-Type"].startswith("application/json"):
            data = json.loads(self.request.body)
            session_id = data['session_id']
            metadata = data['formData']
            prepare_directory(session_id)
            with new_json_file(session_id) as fp:
                fp.write(json.dumps(metadata))

            self.data[session_id]['meta_json'] = metadata

            dest = join(session_id, METADATA_FILE_NAME)
            local = join(get_dataset_path(session_id), METADATA_FILE_NAME)
            self.upload_metadata_s3(local, dest)

            self.set_header("Content-Type", "text/plain")
            self.write("Uploaded to S3: {}".format(data['formData']))
        else:
            print(self.request.headers["Content-Type"])
            self.write("Error: Content-Type has to be 'application/json'")

# copy-pasted from SM_distributed/scripts/generate_ds_config.py
RESOL_POWER_PARAMS = {
    '70K': {
        'fwhm': 0.00285714285,
        'sigma': 0.006728,
        'pts_per_mz': 1750
    },
    '100K': {
        'fwhm': 0.002,
        'sigma': 0.0047096,
        'pts_per_mz': 2500
    },
    '140K': {
        'fwhm': 0.00142857142,
        'sigma': 0.003364,
        'pts_per_mz': 3500
    },
    '250K': {
        'fwhm': 0.0008,
        'sigma': 0.00188384,
        'pts_per_mz': 6250
    },
    '280K': {
        'fwhm': 0.00071428571,
        'sigma': 0.001682,
        'pts_per_mz': 7000
    },
    '500K': {
        'fwhm': 0.0004,
        'sigma': 0.00094192,
        'pts_per_mz': 12500
    }
}

class MoveHandler(tornado.web.RequestHandler):

    def initialize(self, data):
        self.data = data
        self.imzml_fn = None

    def move_s3_files(self, source, dest):
        for obj in s3.Bucket(BUCKET).objects.filter(Prefix=source):
            fn = obj.key.split('/')[-1]
            if fn:
                s3.Object(BUCKET, join(dest, fn)).copy_from(CopySource=join(BUCKET, obj.key))
                obj.delete()

                if fn.lower().endswith('imzml'):
                    self.imzml_fn = fn.rsplit('.', 1)[0]

    def create_config(self, meta_json, dest):
        polarity_dict = {'Positive': '+', 'Negative': '-'}
        polarity = polarity_dict[meta_json['MS_Analysis']['Polarity']]
        instrument = meta_json['MS_Analysis']['Analyzer']
        rp = meta_json['MS_Analysis']['Detector_Resolving_Power']
        rp_mz = float(rp['mz'])
        rp_resolution = float(rp['Resolving_Power'])

        # TODO: use pyMSpec once 'instrument_model' branch is merged into master
        if instrument == 'FTICR':
            rp200 = rp_resolution * rp_mz / 200.0
        elif instrument == 'Orbitrap':
            rp200 = rp_resolution * (rp_mz / 200.0)**0.5
        else:
            rp200 = rp_resolution

        if rp200 < 85000:
            params = RESOL_POWER_PARAMS['70K']
        elif rp200 < 120000:
            params = RESOL_POWER_PARAMS['100K']
        elif rp200 < 195000:
            params = RESOL_POWER_PARAMS['140K']
        elif rp200 < 265000:
            params = RESOL_POWER_PARAMS['250K']
        elif rp200 < 390000:
            params = RESOL_POWER_PARAMS['280K']
        else:
            params = RESOL_POWER_PARAMS['500K']

        ds_config = {
            "database": {
                "name": meta_json['metaspace_options']['Metabolite_Database']
            },
            "isotope_generation": {
                "adducts": {'+': ['+H', '+K', '+Na'], '-': ['-H', '+Cl']}[polarity],
                "charge": {
                    "polarity": polarity,
                    "n_charges": 1
                },
                "isocalc_sigma": round(params['sigma'], 6),
                "isocalc_pts_per_mz": params['pts_per_mz']
            },
            "image_generation": {
                "ppm": 3.0,
                "nlevels": 30,
                "q": 99,
                "do_preprocessing": False
            }
        }

        with tempfile.NamedTemporaryFile() as f:
            json.dump(ds_config, f, indent=4)
            f.flush()
            obj = s3.Object(BUCKET, join(dest, 'config.json'))
            obj.upload_file(f.name)

    def post(self):
        session_id = json.loads(self.request.body)['session_id']

        meta_json = self.data[session_id]['meta_json']
        user_email = meta_json['Submitted_By']['Submitter']['Email'].lower()
        organism = meta_json['Sample_Information']['Organism']
        org_part = meta_json['Sample_Information']['Organism_Part']
        org_condition = meta_json['Sample_Information']['Condition']

        dest = join(user_email, organism, org_part, org_condition, session_id)
        self.move_s3_files(source=session_id, dest=dest)

        self.create_config(meta_json, dest)

        institution = meta_json['Submitted_By']['Institution']
        dataset_name = "{}//{}".format(institution, self.imzml_fn)
        post_to_slack(user_email, dataset_name, join(BUCKET, dest))

        self.set_header("Content-Type", "text/plain")
        self.write("Uploaded to S3. Path: {}".format(dest))


class UploadHandler(tornado.web.RequestHandler):
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')

    def sign_policy(self, policy):
        """ Sign and return the policy document for a simple upload.
        http://aws.amazon.com/articles/1434/#signyours3postform """
        signed_policy = base64.b64encode(policy)
        signature = base64.b64encode(hmac.new(
            self.AWS_SECRET_ACCESS_KEY, signed_policy, hashlib.sha1).
            digest())
        return {'policy': signed_policy, 'signature': signature}

    def sign_headers(self, headers):
        """ Sign and return the headers for a chunked upload. """
        return {
            'signature': base64.b64encode(hmac.new(
                self.AWS_SECRET_ACCESS_KEY, headers, hashlib.sha1).
                digest())
        }

    def post(self):
        """ Route for signing the policy document or REST headers. """
        request_payload = json.loads(self.request.body)
        if request_payload.get('headers'):
            response_data = self.sign_headers(request_payload['headers'])
        else:
            response_data = self.sign_policy(self.request.body)
        return self.write(response_data)


def make_app():
    return tornado.web.Application([
        (r"/", MainHandler),
        (r'/s3/sign', UploadHandler),
        (r"/submit", SubmitHandler, dict(data=data_store)),
        (r'/move_files', MoveHandler, dict(data=data_store)),
    ],
        static_path=join(dirname(__file__), "static"),
        static_url_prefix='/static/',
        debug=False,
        compress_response=True
    )


if __name__ == "__main__":
    if not isdir(TMP_STORAGE_PATH):
        os.mkdir(TMP_STORAGE_PATH)
    app = make_app()
    app.listen(9777)
    tornado.ioloop.IOLoop.current().start()
