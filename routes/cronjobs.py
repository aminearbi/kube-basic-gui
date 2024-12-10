import random
import string
from flask import Blueprint, jsonify, request
from kubernetes_client import get_batch_v1_api, get_core_v1_api
from kubernetes import client, config
from kubernetes.client import V1Job, V1ObjectMeta, V1JobSpec, V1PodTemplateSpec, V1PodSpec, V1Container

cronjobs_bp = Blueprint('cronjobs', __name__)

@cronjobs_bp.route('/cronjobs/<namespace>')
def get_cronjobs(namespace):
    batch_v1 = get_batch_v1_api()
    cronjobs = batch_v1.list_namespaced_cron_job(namespace).items
    cronjob_list = [{'name': cj.metadata.name, 'schedule': cj.spec.schedule} for cj in cronjobs]
    return jsonify({'cronjobs': cronjob_list})


@cronjobs_bp.route('/delete-job/<namespace>/<job_name>', methods=['DELETE'])
def delete_job(namespace, job_name):
    batch_v1 = get_batch_v1_api()
    core_v1 = get_core_v1_api()
    
    # Delete associated pods
    pods = core_v1.list_namespaced_pod(namespace, label_selector=f"job-name={job_name}").items
    for pod in pods:
        core_v1.delete_namespaced_pod(name=pod.metadata.name, namespace=namespace)
    
    # Delete the job
    batch_v1.delete_namespaced_job(name=job_name, namespace=namespace)
    return jsonify({'message': 'Job and associated pods deleted successfully'})

@cronjobs_bp.route('/edit-cronjob/<namespace>/<cronjob_name>', methods=['POST'])
def edit_cronjob(namespace, cronjob_name):
    new_schedule = request.json.get('schedule')
    batch_v1 = get_batch_v1_api()
    cronjob = batch_v1.read_namespaced_cron_job(name=cronjob_name, namespace=namespace)
    cronjob.spec.schedule = new_schedule
    batch_v1.patch_namespaced_cron_job(name=cronjob_name, namespace=namespace, body=cronjob)
    return jsonify({'message': 'CronJob schedule updated successfully'})


