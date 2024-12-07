from flask import Blueprint, jsonify
from kubernetes_client import get_core_v1_api

events_bp = Blueprint('events', __name__)

@events_bp.route('/events/<namespace>')
def get_namespace_events(namespace):
    v1 = get_core_v1_api()
    events = v1.list_namespaced_event(namespace).items
    event_list = [{'name': event.metadata.name, 'message': event.message, 'type': event.type, 'reason': event.reason, 'timestamp': event.last_timestamp} for event in events]
    return jsonify({'events': event_list})
