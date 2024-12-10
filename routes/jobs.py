from flask import Blueprint, jsonify
from kubernetes_client import get_batch_v1_api

jobs_bp = Blueprint('jobs', __name__)

@jobs_bp.route('/jobs/<namespace>/<cronjob_name>')
def get_jobs(namespace, cronjob_name):
    batch_v1 = get_batch_v1_api()
    jobs = batch_v1.list_namespaced_job(namespace).items
    job_list = [{'name': job.metadata.name, 'status': job.status.conditions[0].type if job.status.conditions else 'Unknown'} for job in jobs if job.metadata.owner_references and job.metadata.owner_references[0].name == cronjob_name]
    print(job_list)
    return jsonify({'jobs': job_list})

@jobs_bp.route('/get-jobs/<namespace>')
def get_all_jobs(namespace):
    batch_v1 = get_batch_v1_api()
    jobs = batch_v1.list_namespaced_job(namespace).items
    job_list = [{'name': job.metadata.name, 'status': job.status.conditions[0].type if job.status.conditions else 'Unknown'} for job in jobs]
    return jsonify({'jobs': job_list})
