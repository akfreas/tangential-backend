# Tangential Backend

The Tangential Backend is a serverless application built using the Serverless Framework, Node.js, and TypeScript. This backend is designed to provide processing of your Jira epics to give insights into how projects are progressing.

## Architecture Overview

The application is deployed on AWS and leverages various AWS services, including Lambda, API Gateway, and SQS (Simple Queue Service). It's architected to handle HTTP API requests and process SQS messages, making it highly responsive and capable of handling high-throughput workloads.

### Key Features:

- **Serverless Deployment**: Utilizes AWS Lambda for running serverless functions, reducing the overhead of server management.
- **Scalable Queue Processing**: Integrates AWS SQS for queue management, allowing efficient handling of asynchronous tasks.
- **API Gateway Integration**: Uses AWS API Gateway for handling HTTP API requests, ensuring secure and scalable endpoints.
- **Flexible Environment Configuration**: Supports environment variables for various stages (development, production) through `serverless-dotenv-plugin`.

### Functions:

- HTTP API handlers for initiating workspace analysis, project analysis, and text report generation.
- SQS queue handlers for processing analysis tasks and report generation tasks.

### Environment Variables:

- `OPENAI_API_KEY`: For integrating with OpenAI services.
- `MONGODB_URI`: MongoDB connection URI.
- `MONGODB_DATABASE`: Specifies the database name, dynamically configured based on the deployment stage.

### Custom Domain Configuration:

- Configured to use a custom domain for each stage using `serverless-domain-manager`.

## Getting Started

Clone the repository and run `yarn install` to install dependencies. Ensure AWS credentials are configured for deployment.

You will need to install [Tangential Core](https://github.com/akfreas/tangential-core) to do development on this project.

## Deployment

Deploy the application using the Serverless Framework. Set the required environment variables in the AWS Lambda configuration or through a `.env` file for local development.

## Contributing

Contributions to the Tangential Backend are welcome. Please read the contributing guidelines for more details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

This backend works together with the [Tangential Frontend Repository](https://github.com/akfreas/tangential-frontend) and the [Tangential Core Repository](https://github.com/akfreas/tangential-core).
