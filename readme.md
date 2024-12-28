# Kubernetes GUI

This project provides a web-based GUI for managing Kubernetes resources such as Deployments, StatefulSets, Persistent Volume Claims (PVCs), CronJobs, and Pods. It is built using Flask for the backend and jQuery/Bootstrap for the frontend.

## Features

- View and manage Kubernetes namespaces
- View and scale Deployments and StatefulSets
- View and manage Persistent Volume Claims (PVCs)
- View and manage CronJobs, including editing schedules and creating Jobs from CronJobs
- View and delete Pods
- Stream and view Kubernetes events

## Prerequisites

- Python 3.10+
- Kubernetes cluster
- `kubectl` configured to access your Kubernetes cluster

## Installation

1. Clone the repository:
    ```sh
    git clone git@github.com:aminearbi/kube-basic-gui.git
    cd 
    ```

2. Create a virtual environment and activate it:
    ```sh
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```

3. Install the required Python packages:
    ```sh
    pip install -r requirements.txt
    ```


## Running the Application

1. Start the Flask application:
    ```sh
    python app.py
    ```

2. Open your web browser and navigate to `http://localhost:8080`.


## Running the Application inside Docker

1. Build the Docker image:
    ```sh
    docker build -t kube-gui .
    ```

2. Run the Docker container:
    ```sh
    docker run -p 8080:8080 kube-gui
    ```

Alternatively, you can use Docker Compose:

1. Build and start the services:
    ```sh
    docker-compose up --build
    ```

2. Open your web browser and navigate to `http://localhost:8080`.


## Project Structure