import random
import string
import datetime
import logging
from flask import Blueprint, jsonify
from kubernetes import client, config
from kubernetes.client import V1Job, V1ObjectMeta, V1JobSpec, V1PodTemplateSpec, V1PodSpec, V1Container

# Set up logging
logger = logging.getLogger(__name__)

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
    logger.info(f'Fetching all jobs for namespace: {namespace}')
    try:
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
        logger.info(f'Successfully fetched {len(job_list)} jobs for namespace: {namespace}')
        return jsonify({'jobs': job_list})
    except Exception as e:
        logger.error(f'Error fetching jobs for namespace {namespace}: {e}')
        return jsonify({'error': str(e)}), 500

@jobs_bp.route('/create-job-from-cronjob/<namespace>/<cronjob_name>', methods=['POST'])
def create_job_from_cronjob(namespace, cronjob_name):
    logger.info(f'Creating job from cronjob: {cronjob_name} in namespace: {namespace}')
    try:
        batch_v1 = client.BatchV1Api()
        cronjob = batch_v1.read_namespaced_cron_job(cronjob_name, namespace)
        random_suffix = "manual-" + generate_random_suffix()
        job_name = f"{cronjob_name}-{random_suffix}"

        # Extract the pod template from the cronjob
        pod_template = cronjob.spec.job_template.spec.template

        # Create a new job with the same properties as the cronjob
        job = client.V1Job(
            api_version="batch/v1",
            kind="Job",
            metadata=client.V1ObjectMeta(
                name=job_name,
                labels=cronjob.metadata.labels,
                owner_references=[client.V1OwnerReference(
                    api_version=cronjob.api_version,
                    kind=cronjob.kind,
                    name=cronjob.metadata.name,
                    uid=cronjob.metadata.uid
                )]
            ),
            spec=client.V1JobSpec(
                template=client.V1PodTemplateSpec(
                    metadata=client.V1ObjectMeta(
                        labels=pod_template.metadata.labels
                    ),
                    spec=client.V1PodSpec(
                        containers=[
                            client.V1Container(
                                name=container.name,
                                image=container.image,
                                command=container.command,
                                args=container.args,
                                env=container.env,
                                resources=container.resources,
                                volume_mounts=container.volume_mounts,
                                ports=container.ports,
                                liveness_probe=container.liveness_probe,
                                readiness_probe=container.readiness_probe,
                                security_context=container.security_context
                            ) for container in pod_template.spec.containers
                        ],
                        restart_policy="Never",
                        volumes=pod_template.spec.volumes,
                        node_selector=pod_template.spec.node_selector,
                        service_account_name=pod_template.spec.service_account_name,
                        security_context=pod_template.spec.security_context,
                        affinity=pod_template.spec.affinity,
                        tolerations=pod_template.spec.tolerations,
                        host_network=pod_template.spec.host_network,
                        dns_policy=pod_template.spec.dns_policy,
                        scheduler_name=pod_template.spec.scheduler_name
                    )
                )
            )
        )

        batch_v1.create_namespaced_job(namespace, job)
        logger.info(f'Successfully created job: {job_name} from cronjob: {cronjob_name} in namespace: {namespace}')
        return jsonify({'job_name': f'{job_name}'})
    except Exception as e:
        logger.error(f'Error creating job from cronjob {cronjob_name} in namespace {namespace}: {e}')
        return jsonify({'error': str(e)}), 500