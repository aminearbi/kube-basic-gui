import random
import string
import datetime
from flask import Blueprint, jsonify
from kubernetes import client, config
from kubernetes.client import V1Job, V1ObjectMeta, V1JobSpec, V1PodTemplateSpec, V1PodSpec, V1Container

jobs_bp = Blueprint('jobs', __name__)

config.load_kube_config()

def generate_random_suffix(length=6):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

@jobs_bp.route('/jobs/<namespace>/<cronjob_name>')
def get_jobs(namespace, cronjob_name):
    batch_v1 = client.BatchV1Api()
    jobs = batch_v1.list_namespaced_job(namespace).items
    job_list = []
    for job in jobs:
        if job.metadata.owner_references and job.metadata.owner_references[0].name == cronjob_name:
            start_time = job.status.start_time
            age = (datetime.datetime.now(datetime.timezone.utc) - start_time).total_seconds() // 60 if start_time else 'Unknown'
            job_list.append({
                'name': job.metadata.name,
                'status': job.status.conditions[0].type if job.status.conditions else 'Unknown',
                'age': age
            })
    return jsonify({'jobs': job_list})

@jobs_bp.route('/jobs/<namespace>')
def get_all_jobs(namespace):
    batch_v1 = client.BatchV1Api()
    jobs = batch_v1.list_namespaced_job(namespace).items
    job_list = []
    for job in jobs:
        start_time = job.status.start_time
        age = (datetime.datetime.now(datetime.timezone.utc) - start_time).total_seconds() // 60 if start_time else 'Unknown'
        job_list.append({
            'name': job.metadata.name,
            'status': job.status.conditions[0].type if job.status.conditions else 'Unknown',
            'age': age
        })
    return jsonify({'jobs': job_list})

@jobs_bp.route('/create-job-from-cronjob/<namespace>/<cronjob_name>', methods=['POST'])
def create_job_from_cronjob(namespace, cronjob_name):
    batch_v1 = client.BatchV1Api()
    cronjob = batch_v1.read_namespaced_cron_job(cronjob_name, namespace)
    random_suffix = "manual-"+generate_random_suffix()
    job_name = f"{cronjob_name}-{random_suffix}"
    job = V1Job(
        api_version="batch/v1",
        kind="Job",
        metadata=V1ObjectMeta(name=job_name, owner_references=[client.V1OwnerReference(
            api_version=cronjob.api_version,
            kind=cronjob.kind,
            name=cronjob.metadata.name,
            uid=cronjob.metadata.uid
        )]),
        spec=V1JobSpec(
            template=V1PodTemplateSpec(
                spec=V1PodSpec(
                    containers=[
                        V1Container(
                            name=cronjob_name,
                            image=cronjob.spec.job_template.spec.template.spec.containers[0].image,
                            command=cronjob.spec.job_template.spec.template.spec.containers[0].command
                        )
                    ],
                    restart_policy="Never"
                )
            )
        )
    )
    batch_v1.create_namespaced_job(namespace, job)
    return jsonify({'message': f'Job :{job_name} created from CronJob {cronjob_name} successfully'})
