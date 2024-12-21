import logging
from flask import Blueprint, jsonify
from kubernetes_client import get_core_v1_api

# Set up logging
logger = logging.getLogger(__name__)

events_bp = Blueprint('events', __name__)

@events_bp.route('/events/<namespace>')
def get_namespace_events(namespace):
    logger.info(f'Fetching events for namespace: {namespace}')
    try:
        v1 = get_core_v1_api()
        events = v1.list_namespaced_event(namespace).items
        event_list = [{'name': event.metadata.name, 'message': event.message, 'type': event.type, 'reason': event.reason, 'timestamp': event.last_timestamp} for event in events]
        logger.info(f'Successfully fetched {len(event_list)} events for namespace: {namespace}')
        return jsonify({'events': event_list})
    except Exception as e:
        logger.error(f'Error fetching events for namespace {namespace}: {e}')
        return jsonify({'error': str(e)}), 500
