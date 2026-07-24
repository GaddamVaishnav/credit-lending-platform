pipeline {
    agent any

    tools {
        maven 'Maven-3.9'
        jdk   'JDK-17'
    }

    environment {
        AWS_ACCOUNT_ID     = credentials('aws-account-id')
        AWS_REGION         = 'ap-south-1'
        ECR_REGISTRY       = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        DOCKER_IMAGE_TAG   = "${BUILD_NUMBER}-${GIT_COMMIT.take(7)}"
        KUBECONFIG         = credentials('kubeconfig')
    }

    stages {

        // ── Stage 1: Checkout ─────────────────────────────────
        stage('Checkout Code') {
            steps {
                echo '📥 Checking out from Git...'
                checkout scm
                sh 'git log --oneline -5'
            }
        }

        // ── Stage 2: Build with Maven ─────────────────────────
        stage('Maven Build') {
            steps {
                echo '🔨 Building all microservices with Maven...'
                sh 'mvn clean compile -pl onboarding-service,loan-service,disbursement-service,repayment-service,notification-service,api-gateway'
            }
        }

        // ── Stage 3: Unit Tests (JUnit + Log4j) ───────────────
        stage('Run Unit Tests') {
            steps {
                echo '🧪 Running JUnit tests...'
                sh 'mvn test -pl onboarding-service,loan-service,repayment-service'
            }
            post {
                always {
                    junit '**/target/surefire-reports/*.xml'
                    publishHTML([
                        reportDir:   'target/surefire-reports',
                        reportFiles: 'index.html',
                        reportName:  'JUnit Test Report'
                    ])
                }
            }
        }

        // ── Stage 4: Package JARs ─────────────────────────────
        stage('Maven Package') {
            steps {
                echo '📦 Packaging JARs...'
                sh 'mvn package -DskipTests'
                sh 'ls -la */target/*.jar'
            }
        }

        // ── Stage 5: Code Quality (SonarQube) ─────────────────
        stage('Code Quality Check') {
            when { branch 'main' }
            steps {
                echo '🔍 Running code quality analysis...'
                withSonarQubeEnv('SonarQube') {
                    sh 'mvn sonar:sonar'
                }
            }
        }

        // ── Stage 6: Docker Build & Push to ECR ───────────────
        stage('Docker Build & Push to ECR') {
            steps {
                echo '🐳 Building Docker images and pushing to AWS ECR...'
                script {
                    // Login to ECR
                    sh """
                        aws ecr get-login-password --region ${AWS_REGION} | \
                        docker login --username AWS --password-stdin ${ECR_REGISTRY}
                    """

                    // Build and push each service
                    def services = [
                        [name: 'onboarding-service',   file: 'Dockerfile.onboarding'],
                        [name: 'loan-service',          file: 'Dockerfile.loan'],
                        [name: 'disbursement-service',  file: 'Dockerfile.disbursement'],
                        [name: 'repayment-service',     file: 'Dockerfile.repayment'],
                        [name: 'notification-service',  file: 'Dockerfile.notification'],
                        [name: 'api-gateway',           file: 'Dockerfile.gateway'],
                        [name: 'frontend',              file: 'Dockerfile.frontend']
                    ]

                    services.each { svc ->
                        echo "Building ${svc.name}..."
                        sh """
                            docker build \
                                -f dockerfiles/${svc.file} \
                                -t ${ECR_REGISTRY}/credit/${svc.name}:${DOCKER_IMAGE_TAG} \
                                -t ${ECR_REGISTRY}/credit/${svc.name}:latest \
                                .
                            docker push ${ECR_REGISTRY}/credit/${svc.name}:${DOCKER_IMAGE_TAG}
                            docker push ${ECR_REGISTRY}/credit/${svc.name}:latest
                        """
                        echo "✅ ${svc.name} pushed to ECR"
                    }
                }
            }
        }

        // ── Stage 7: Deploy to Kubernetes (EKS) ───────────────
        stage('Deploy to Kubernetes (EKS)') {
            when { branch 'main' }
            steps {
                echo '☸️ Deploying to Amazon EKS...'
                script {
                    // Update image tags in K8s manifests
                    sh """
                        sed -i 's|IMAGE_TAG|${DOCKER_IMAGE_TAG}|g' k8s/*.yml
                        kubectl apply -f k8s/ --kubeconfig=${KUBECONFIG}
                        kubectl rollout status deployment/onboarding-service -n credit-platform
                        kubectl rollout status deployment/loan-service -n credit-platform
                        kubectl get pods -n credit-platform
                    """
                }
            }
        }

        // ── Stage 8: Smoke Test ───────────────────────────────
        stage('Smoke Test') {
            steps {
                echo '🔥 Running smoke tests...'
                script {
                    def alb_url = sh(
                        script: "kubectl get svc api-gateway -n credit-platform -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'",
                        returnStdout: true
                    ).trim()
                    sh "curl -f http://${alb_url}/actuator/health || exit 1"
                    echo "✅ Smoke test passed — App is live at: http://${alb_url}"
                }
            }
        }

        // ── Stage 9: Deploy Frontend to S3 ───────────────────
        stage('Deploy Frontend to S3') {
            when { branch 'main' }
            steps {
                echo '🌐 Deploying Angular frontend to S3 + CloudFront...'
                sh """
                    cd frontend
                    npm ci
                    npm run build -- --configuration=production
                    aws s3 sync dist/credit-platform-frontend/browser/ \
                        s3://credit-platform-frontend \
                        --delete \
                        --cache-control "max-age=31536000"
                    aws cloudfront create-invalidation \
                        --distribution-id ${CLOUDFRONT_ID} \
                        --paths "/*"
                """
            }
        }
    }

    post {
        success {
            echo """
            ✅ DEPLOYMENT SUCCESSFUL!
            Build: ${BUILD_NUMBER}
            Commit: ${GIT_COMMIT}
            Image Tag: ${DOCKER_IMAGE_TAG}
            """
            // Send email notification (uses JavaMail/Log4j internally)
            emailext(
                subject: "✅ Credit Platform Build #${BUILD_NUMBER} Deployed",
                body: "Deployment successful. Image: ${DOCKER_IMAGE_TAG}",
                to: 'team@creditplatform.com'
            )
        }
        failure {
            echo "❌ DEPLOYMENT FAILED — Check logs above"
            emailext(
                subject: "❌ Credit Platform Build #${BUILD_NUMBER} FAILED",
                body: "Build failed. Check Jenkins: ${BUILD_URL}",
                to: 'team@creditplatform.com'
            )
        }
        always {
            // Clean up Docker images to save disk space
            sh 'docker system prune -f || true'
        }
    }
}
