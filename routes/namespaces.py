import logging
from flask import Blueprint, jsonify
from kubernetes_client import get_core_v1_api

# Set up logging
logger = logging.getLogger(__name__)

namespaces_bp = Blueprint('namespaces', __name__)

@namespaces_bp.route('/namespaces')
def get_namespaces():
    logger.info('Fetching all namespaces')
    try:
        v1 = get_core_v1_api()
        namespaces = v1.list_namespace().items
        namespace_list = [ns.metadata.name for ns in namespaces]
        logger.info(f'Successfully fetched {len(namespace_list)} namespaces')
        return jsonify({'namespaces': namespace_list})
    except Exception as e:
        logger.error(f'Error fetching namespaces: {e}')
        return jsonify({'error': str(e)}), 500