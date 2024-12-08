from flask import Flask, send_from_directory
from kubernetes_client import load_kube_config
from routes.namespaces import namespaces_bp
from routes.statefulsets import statefulsets_bp
from routes.deployments import deployments_bp
from routes.pvcs import pvcs_bp
from routes.pods import pods_bp
from routes.events import events_bp
from routes.cronjobs import cronjobs_bp
from routes.jobs import jobs_bp

app = Flask(__name__, static_folder='frontend', static_url_path='')

# Load Kubernetes config
load_kube_config()

# Register blueprints
app.register_blueprint(namespaces_bp)
app.register_blueprint(statefulsets_bp)
app.register_blueprint(deployments_bp)
app.register_blueprint(pvcs_bp)
app.register_blueprint(pods_bp)
app.register_blueprint(events_bp)
app.register_blueprint(cronjobs_bp)
app.register_blueprint(jobs_bp)

@app.route('/')
def serve_frontend():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

if __name__ == "__main__":
    app.run(port=8080, debug=True)
