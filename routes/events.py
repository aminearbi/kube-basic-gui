import logging
from flask import Blueprint, jsonify, Response, stream_with_context
from kubernetes import client, config, watch
import json
from datetime import datetime

# Set up logging
logger = logging.getLogger(__name__)

events_bp = Blueprint('events', __name__)

def datetime_converter(o):
    if isinstance(o, datetime):
        return o.isoformat()
    return o

@events_bp.route('/events/<namespace>', methods=['GET'])
def stream_events(namespace):
    logger.info(f'Streaming events for namespace: {namespace}')
    def generate():
        config.load_kube_config()
        v1 = client.CoreV1Api()
        w = watch.Watch()
        for event in w.stream(v1.list_namespaced_event, namespace=namespace):
            event_dict = event['object'].to_dict()
            event_dict['first_timestamp'] = event['object'].first_timestamp
            event_dict['lastTimestamp'] = event['object'].last_timestamp
            yield f"data: {json.dumps(event_dict, default=datetime_converter)}\n\n"

    return Response(stream_with_context(generate()), content_type='text/event-stream')
