from flask import Blueprint, jsonify
from kubernetes_client import get_core_v1_api

namespaces_bp = Blueprint('namespaces', __name__)

@namespaces_bp.route('/namespaces')
def get_namespaces():
    v1 = get_core_v1_api()
    namespaces = v1.list_namespace().items
    namespace_list = [ns.metadata.name for ns in namespaces]
    return jsonify({'namespaces': namespace_list})
