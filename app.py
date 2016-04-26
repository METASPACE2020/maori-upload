import os

import tornado.ioloop
import tornado.web

FILE_STORAGE_PATH = "media"


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render('static/index.html')


def new_file():
    filenames = os.listdir(FILE_STORAGE_PATH)
    latest = max([int(fn.split('.')[0]) for fn in filenames if fn.endswith('.foo')] + [-1])
    return open(os.path.join(FILE_STORAGE_PATH, "%s.foo" % str(latest + 1)), 'wb')


class SubmitHandler(tornado.web.RequestHandler):
    def post(self):
        if self.request.headers["Content-Type"].startswith("application/json"):
            data = self.request.body
            with new_file() as fp:
                fp.write(data)
            self.set_header("Content-Type", "text/plain")
            self.write("You wrote {}".format(data))
        else:
            self.write("Content-Type has to be 'application/json")


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
    app.listen(8888)
    tornado.ioloop.IOLoop.current().start()
