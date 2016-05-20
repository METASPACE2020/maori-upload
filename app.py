import os
from os.path import dirname, exists, isdir, join, splitext
from uuid import uuid4
import base64
import hmac
import hashlib
import json

import tornado.ioloop
import tornado.web

FILE_STORAGE_PATH = "media"


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        # if not self.get_cookie('session_id'):
        # self.set_cookie('session_id', new_session_id())
        self.set_cookie('session_id', str(uuid4()))
        self.render('static/index.html')


def new_session_id():
    dirnames = [n for n in os.listdir(FILE_STORAGE_PATH) if isdir(join(FILE_STORAGE_PATH, n))]
    session_id = None
    # the very unlikely case that the UUID has been generated before
    while session_id is None or session_id in dirnames:
        session_id = str(uuid4())
    return session_id


def new_json_file(session_id):
    dir_path = get_dataset_path(session_id)
    file_path = join(dir_path, "meta.json")
    if exists(file_path):
        raise RuntimeError("JSON already exists: {}".format(file_path))
    return open(file_path, 'wb')


def get_dataset_path(session_id):
    return join(FILE_STORAGE_PATH, session_id)


def new_data_files(imzml_filename, ibd_filename, session_id):
    dir_path = get_dataset_path(session_id)
    filenames = os.listdir(dir_path)
    if any(fn.endswith('.imzml') or fn.endswith('.ibd') for fn in filenames):
        raise RuntimeError("Data already exist in directory {}".format(dir_path))
    return open(join(dir_path, "{}.imzML".format(splitext(imzml_filename)[0])), 'wb'), open(
        join(dir_path, "{}.ibd".format(splitext(ibd_filename)[0])), 'wb')


def prepare_directory(session_id):
    dir_path = get_dataset_path(session_id)
    if not isdir(dir_path):
        os.mkdir(dir_path)


class SubmitHandler(tornado.web.RequestHandler):
    def post(self):
        session_id = self.get_cookie('session_id')
        prepare_directory(session_id)
        if self.request.headers["Content-Type"].startswith("application/json"):
            data = self.request.body
            with new_json_file(session_id) as fp:
                fp.write(data)
            self.set_header("Content-Type", "text/plain")
            self.write("You wrote {}".format(data))
        elif self.request.headers["Content-Type"].startswith("multipart/form-data"):
            ibd_input_file = self.request.files["ibd_file"][0]
            imzml_input_file = self.request.files["imzml_file"][0]
            imzml_filename, ibd_filename = imzml_input_file.filename, ibd_input_file.filename
            files = new_data_files(imzml_filename, ibd_filename, session_id)
            with files[0] as imzml_file, files[1] as ibd_file:
                ibd_file.write(ibd_input_file.body)
                imzml_file.write(imzml_input_file.body)
            self.set_cookie('session_id', new_session_id())
            self.write("The submission was successful.")
        else:
            print(self.request.headers["Content-Type"])
            self.write("Error: Content-Type has to be 'application/json' or 'multipart/form-data'")


class UploadHandler(tornado.web.RequestHandler):
    AWS_CLIENT_SECRET_KEY = os.getenv('AWS_CLIENT_SECRET_KEY')

    def sign_policy(self, policy):
        """ Sign and return the policy document for a simple upload.
        http://aws.amazon.com/articles/1434/#signyours3postform """
        signed_policy = base64.b64encode(policy)
        signature = base64.b64encode(hmac.new(
            self.AWS_CLIENT_SECRET_KEY, signed_policy, hashlib.sha1).
            digest())
        return {'policy': signed_policy, 'signature': signature}

    def sign_headers(self, headers):
        """ Sign and return the headers for a chunked upload. """
        return {
            'signature': base64.b64encode(hmac.new(
                self.AWS_CLIENT_SECRET_KEY, headers, hashlib.sha1).
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


# class UploadMainHandler(tornado.web.RequestHandler):
#     def get(self):
#         self.render('static/upload-index.html')


def make_app():
    return tornado.web.Application([
        (r"/", MainHandler),
        (r"/submit", SubmitHandler),
        (r'/s3/sign', UploadHandler),
        # (r'/upload', UploadMainHandler),
    ],
        static_path=join(dirname(__file__), "static"),
        static_url_prefix='/static/',
        debug=True,
        compress_response=True
    )


if __name__ == "__main__":
    if not isdir(FILE_STORAGE_PATH):
        os.mkdir(FILE_STORAGE_PATH)
    app = make_app()
    app.listen(9777)
    tornado.ioloop.IOLoop.current().start()
