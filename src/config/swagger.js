
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CRM API Documentation',
      version: '1.0.0',
      description: 'API documentation for the CRM system',
    },
    servers: [
      {
        url: `http://0.0.0.0:${process.env.PORT || 8000}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to the API docs
};

export const specs = swaggerJsdoc(options);
