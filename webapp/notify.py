from requests import post
import json
import yaml
import pika
from tornado.options import options


def post_to_slack(emoji, msg):
    config = yaml.load(open(options.config))
    msg = {"channel": config['slack']['channel'],
           "username": "webhookbot",
           "text": ":{}:{}".format(emoji, msg),
           "icon_emoji": ":robot_face:"}
    post(config['slack']['webhook_url'], json=msg)


def post_job_to_queue(m):
    config = yaml.load(open(options.config))
    creds = pika.PlainCredentials(config['rabbitmq']['user'], config['rabbitmq']['password'])
    conn = pika.BlockingConnection(pika.ConnectionParameters(host=config['rabbitmq']['host'], credentials=creds))

    ch = conn.channel()
    ch.queue_declare(queue='sm_annotate', durable=True)
    ch.basic_publish(exchange='',
                     routing_key='sm_annotate',
                     body=json.dumps(m, ensure_ascii=False),
                     properties=pika.BasicProperties(
                         delivery_mode=2,  # make message persistent
                     ))
    conn.close()
