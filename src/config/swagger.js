const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tenderbite API Service',
      version: '1.0.0',
      description:
        'RESTful API for managing Tenderbite Commerce Platform. ' +
        'Images are optimised with Sharp (converted to WebP) before storage ' +
        'and served via a dedicated fast-retrieval endpoint.',
      contact: {
        name: 'API Support',
        email: 'adabo@variablexsolutions.com',
      },
    },
    servers: [
      {
        url: process.env.BASE_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            productName: {
              type: 'string',
              example: 'Wireless Headphones',
            },
            description: {
              type: 'string',
              example: '5kg Full Chicken',
            },
			  weight: {
              type: 'string',
              example: '5kg',
            },
			 category: {
              type: 'string',
              example: 'Offal',
            },
            productImage: {
              type: 'string',
              example: 'http://localhost:3000/api/products/550e8400.../image',
              description: 'URL to retrieve the product image',
            },
            imageMimeType: {
              type: 'string',
              example: 'image/webp',
            },
            imageSize: {
              type: 'integer',
              example: 45230,
              description: 'Optimised image size in bytes',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        ProductInput: {
          type: 'object',
          required: ['productName'],
          properties: {
            productName: {
              type: 'string',
              example: 'Full Chicken',
            },
            description: {
              type: 'string',
              example: '5kg Full Chicken',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { $ref: '#/components/schemas/Product' },
          },
        },
        PaginatedProducts: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Products' },
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer', example: 100 },
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 10 },
                totalPages: { type: 'integer', example: 10 },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;