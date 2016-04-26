import os

import tornado.ioloop
import tornado.web

FILE_STORAGE_PATH = "media"


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render('static/html/index.html')


def new_file():
    filenames = os.listdir(FILE_STORAGE_PATH)
    latest = max([int(fn.split('.')[0]) for fn in filenames if fn.endswith('.foo')] + [-1])
    return open(os.path.join(FILE_STORAGE_PATH, "%s.foo" % str(latest + 1)), 'wb')


class SubmitHandler(tornado.web.RequestHandler):
    def post(self):
        file = self.request.files["file1"]
        with new_file() as fp:
            fp.write(file[0]["body"])
        self.set_header("Content-Type", "text/plain")
        self.write("You wrote " + self.get_body_argument("message"))


def make_app():
    return tornado.web.Application([
        (r"/", MainHandler),
        (r"/submit", SubmitHandler)
    ])


if __name__ == "__main__":
    if not os.path.isdir(FILE_STORAGE_PATH):
        os.mkdir(FILE_STORAGE_PATH)
    app = make_app()
    app.listen(8888)
    tornado.ioloop.IOLoop.current().start()
