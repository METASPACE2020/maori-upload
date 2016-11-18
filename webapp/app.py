import os
from os.path import dirname, exists, isdir, join, splitext
import base64
import hmac
import hashlib
import json
import boto3
import tempfile
import tornado.ioloop
import tornado.web
from tornado.options import define, options
from datetime import datetime as dt
import yaml

from notify import post_to_slack, post_job_to_queue


TMP_STORAGE_PATH = "/tmp"
METADATA_FILE_NAME = "meta.json"
CONFIG_FILE_NAME = "config.json"

# Resolving Power defined at m/z 200. Compromise values based on the average resolving power @m/z 500 of Orbitrap and FTICR instruments. #todo replace this with full instrument model
RESOL_POWER_PARAMS = {
    '70K': {'sigma': 0.00247585727028, 'fwhm': 0.00583019832869, 'pts_per_mz': 2019},
    '100K': {'sigma': 0.0017331000892, 'fwhm': 0.00408113883008, 'pts_per_mz': 2885},
    '140K': {'sigma': 0.00123792863514, 'fwhm': 0.00291509916435, 'pts_per_mz': 4039},
    '200K': {'sigma': 0.000866550044598, 'fwhm': 0.00204056941504, 'pts_per_mz': 5770},
    '250K': {'sigma': 0.000693240035678, 'fwhm': 0.00163245553203, 'pts_per_mz': 7212},
    '280K': {'sigma': 0.00061896431757, 'fwhm': 0.00145754958217, 'pts_per_mz': 8078},
    '500K': {'sigma': 0.000346620017839, 'fwhm': 0.000816227766017, 'pts_per_mz': 14425},
    '750K': {'sigma': 0.000231080011893, 'fwhm': 0.000544151844011, 'pts_per_mz': 21637},
    '1000K': {'sigma': 0.00017331000892, 'fwhm': 0.000408113883008, 'pts_per_mz': 28850},
}


def create_config(meta_json):
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
        rp200 = rp_resolution * (rp_mz / 200.0) ** 0.5
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
    elif rp200 < 625000:
        params = RESOL_POWER_PARAMS['500K']
    elif rp200 < 875000:
        params = RESOL_POWER_PARAMS['750K']
    else:
        params = RESOL_POWER_PARAMS['1000K']

    return {
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


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render('static/index.html')


class SubmitHandler(tornado.web.RequestHandler):

    def initialize(self):
        self.config = yaml.load(open(options.config))
        self.s3 = boto3.resource('s3', self.config['aws']['region'])

    def upload_to_s3(self, doc, bucket, key):
        with tempfile.NamedTemporaryFile() as f:
            json.dump(doc, f, indent=4)
            f.flush()
            obj = self.s3.Object(bucket, key)
            obj.upload_file(f.name)

    def post(self):
        if self.request.headers["Content-Type"].startswith("application/json"):
            data = json.loads(self.request.body)
            session_id = data['session_id']
            metadata = data['formData']

            self.upload_to_s3(metadata, self.config['aws']['s3_bucket'], join(session_id, METADATA_FILE_NAME))

            ds_config = create_config(metadata)
            self.upload_to_s3(ds_config, self.config['aws']['s3_bucket'], join(session_id, CONFIG_FILE_NAME))


            self.set_header("Content-Type", "text/plain")
            self.write("Uploaded to S3: {}".format(data['formData']))
        else:
            print(self.request.headers["Content-Type"])
            self.write("Error: Content-Type has to be 'application/json'")


class MessageHandler(tornado.web.RequestHandler):

    def initialize(self):
        self.config = yaml.load(open(options.config))

    def post(self):
        if self.request.headers["Content-Type"].startswith("application/json"):
            data = json.loads(self.request.body)
            session_id = data['session_id']
            metadata = data['formData']

            ds_name = u'{}//{}'.format(metadata['Submitted_By']['Institution'],
                                      metadata['metaspace_options']['Dataset_Name'])

            msg = {
                'ds_id': dt.now().strftime("%Y-%m-%d_%Hh%Mm%Ss"),
                'ds_name': ds_name,
                'input_path': 's3a://{}/{}'.format(self.config['aws']['s3_bucket'], session_id),
                'user_email': metadata['Submitted_By']['Submitter']['Email'].lower()
            }

            if self.config['slack']['webhook_url']:
                post_to_slack('email', " [v] Sent: {}".format(json.dumps(msg)))
            if self.config['rabbitmq']['host']:
                post_job_to_queue(msg)
        else:
            print(self.request.headers["Content-Type"])
            self.write("Error: Content-Type has to be 'application/json'")


class UploadHandler(tornado.web.RequestHandler):

    def initialize(self):
        self.config = yaml.load(open(options.config))

    def sign_policy(self, policy):
        """ Sign and return the policy document for a simple upload.
        http://aws.amazon.com/articles/1434/#signyours3postform """
        signed_policy = base64.b64encode(policy)
        signature = base64.b64encode(hmac.new(
            self.config['aws']['secret_access_key'], signed_policy, hashlib.sha1).
            digest())
        return {'policy': signed_policy, 'signature': signature}

    def sign_headers(self, headers):
        """ Sign and return the headers for a chunked upload. """
        return {
            'signature': base64.b64encode(hmac.new(
                self.config['aws']['secret_access_key'], headers, hashlib.sha1).
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


class WebConfigHandler(tornado.web.RequestHandler):

    def get(self):
        self.write(json.load(open(options.web_config)))


def make_app():
    define('config', type=str)
    define('web_config', type=str)
    options.parse_command_line()

    return tornado.web.Application([
        (r"/", MainHandler),
        (r'/s3/sign', UploadHandler),
        (r"/submit", SubmitHandler),
        (r"/config.json", WebConfigHandler),
        (r"/send_msg", MessageHandler)
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
