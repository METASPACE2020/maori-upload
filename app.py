import os

import tornado.ioloop
import tornado.web

FILE_STORAGE_PATH = "media"


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render('static/index.html')


def new_json_file():
    filenames = os.listdir(FILE_STORAGE_PATH)
    latest = max([int(fn.split('.')[0]) for fn in filenames if fn.endswith('.json')] + [-1])
    return open(os.path.join(FILE_STORAGE_PATH, "%s.json" % str(latest + 1)), 'wb')


def new_data_files():
    filenames = os.listdir(FILE_STORAGE_PATH)
    latest = max([int(fn.split('.')[0]) for fn in filenames if fn.endswith('.json')] + [-1])
    return open(os.path.join(FILE_STORAGE_PATH, "{}.imzml".format(latest)), 'wb'), open(os.path.join(
        FILE_STORAGE_PATH, "{}.ibd".format(latest)), 'wb')


class SubmitHandler(tornado.web.RequestHandler):
    def post(self):
        if self.request.headers["Content-Type"].startswith("application/json"):
            data = self.request.body
            with new_json_file() as fp:
                fp.write(data)
            self.set_header("Content-Type", "text/plain")
            self.write("You wrote {}".format(data))
        elif self.request.headers["Content-Type"].startswith("multipart/form-data"):
            files = new_data_files()
            with files[0] as imzml_file, files[1] as ibd_file:
                input_file = self.request.files["ibd_file"]
                ibd_file.write(input_file[0]['body'])
                input_file = self.request.files["imzml_file"]
                imzml_file.write(input_file[0]['body'])
            self.write("The submission was successful.")
        else:
            print(self.request.headers["Content-Type"])
            self.write("Error: Content-Type has to be 'application/json' or 'multipart/form-data'")


def make_app():
    return tornado.web.Application([
        (r"/", MainHandler),
        (r"/submit", SubmitHandler),
    ],
        static_path=os.path.join(os.path.dirname(__file__), "static"),
        static_url_prefix='/static/'
    )


if __name__ == "__main__":
    if not os.path.isdir(FILE_STORAGE_PATH):
        os.mkdir(FILE_STORAGE_PATH)
    app = make_app()
    app.listen(9777)
    tornado.ioloop.IOLoop.current().start()
