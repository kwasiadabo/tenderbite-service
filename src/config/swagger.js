const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Products API',
      version: '1.0.0',
      description: 'RESTful API for managing products, pricing, and customer orders.',
      contact: { name: 'API Support', email: 'support@example.com' },
    },
    servers: [{ url: process.env.BASE_URL || 'http://localhost:3000', description: 'Development server' }],
    components: {
      schemas: {

        // ── Product ───────────────────────────────────────────────────────
        Product: {
          type: 'object',
          properties: {
            id:            { type: 'string', format: 'uuid' },
            productName:   { type: 'string', example: 'Wireless Headphones' },
            description:   { type: 'string', nullable: true },
            productImage:  { type: 'string', example: 'http://localhost:3000/api/products/.../image' },
            imageMimeType: { type: 'string', example: 'image/webp' },
            imageSize:     { type: 'integer', example: 45230 },
            createdAt:     { type: 'string', format: 'date-time' },
            updatedAt:     { type: 'string', format: 'date-time' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data:    { $ref: '#/components/schemas/Product' },
          },
        },
        PaginatedProducts: {
          type: 'object',
          properties: {
            success:    { type: 'boolean', example: true },
            data:       { type: 'array', items: { $ref: '#/components/schemas/Product' } },
            pagination: { $ref: '#/components/schemas/Pagination' },
          },
        },

        // ── Price ─────────────────────────────────────────────────────────
        Price: {
          type: 'object',
          properties: {
            id:            { type: 'string', format: 'uuid' },
            productId:     { type: 'string', format: 'uuid' },
            price:         { type: 'number', format: 'float', example: 49.99 },
            currency:      { type: 'string', example: 'USD' },
            effectiveFrom: { type: 'string', format: 'date-time', nullable: true },
            effectiveTo:   { type: 'string', format: 'date-time', nullable: true },
            createdAt:     { type: 'string', format: 'date-time' },
            updatedAt:     { type: 'string', format: 'date-time' },
          },
        },
        PriceInput: {
          type: 'object',
          required: ['price', 'currency'],
          properties: {
            price:         { type: 'number', example: 49.99 },
            currency:      { type: 'string', example: 'USD' },
            effectiveFrom: { type: 'string', format: 'date-time', nullable: true },
            effectiveTo:   { type: 'string', format: 'date-time', nullable: true },
          },
        },
        PriceResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data:    { $ref: '#/components/schemas/Price' },
          },
        },
        ActivePriceSnapshot: {
          type: 'object',
          nullable: true,
          properties: {
            id:            { type: 'string', format: 'uuid' },
            price:         { type: 'number', example: 49.99 },
            currency:      { type: 'string', example: 'USD' },
            effectiveFrom: { type: 'string', format: 'date-time', nullable: true },
            effectiveTo:   { type: 'string', format: 'date-time', nullable: true },
            createdAt:     { type: 'string', format: 'date-time' },
            updatedAt:     { type: 'string', format: 'date-time' },
          },
        },
        ProductWithActivePrice: {
          type: 'object',
          properties: {
            productId:        { type: 'string', format: 'uuid' },
            productName:      { type: 'string', example: 'Wireless Headphones' },
            description:      { type: 'string', nullable: true },
            productImage:     { type: 'string' },
            productCreatedAt: { type: 'string', format: 'date-time' },
            productUpdatedAt: { type: 'string', format: 'date-time' },
            activePrice:      { $ref: '#/components/schemas/ActivePriceSnapshot' },
          },
        },

        // ── Order ─────────────────────────────────────────────────────────
        OrderItem: {
          type: 'object',
          properties: {
            id:          { type: 'string', format: 'uuid' },
            orderId:     { type: 'string', format: 'uuid' },
            productId:   { type: 'string', format: 'uuid', nullable: true },
            category:    { type: 'string', example: 'Electronics' },
            productName: { type: 'string', example: 'Wireless Headphones' },
            description: { type: 'string', nullable: true },
            weight:      { type: 'number', nullable: true, example: 0.35 },
            weightUnit:  { type: 'string', nullable: true, example: 'kg', enum: ['kg','g','lb','oz','ton'] },
            unitPrice:   { type: 'number', example: 129.99 },
            quantity:    { type: 'integer', example: 2 },
            lineTotal:   { type: 'number', example: 259.98 },
            currency:    { type: 'string', example: 'USD' },
          },
        },
        OrderItemInput: {
          type: 'object',
          required: ['category', 'productName', 'unitPrice', 'quantity'],
          properties: {
            productId:   { type: 'string', format: 'uuid', nullable: true, description: 'Optional – links to a catalogue product' },
            category:    { type: 'string', example: 'Electronics' },
            productName: { type: 'string', example: 'Wireless Headphones' },
            description: { type: 'string', nullable: true },
            weight:      { type: 'number', nullable: true, example: 0.35 },
            weightUnit:  { type: 'string', nullable: true, example: 'kg', enum: ['kg','g','lb','oz','ton'] },
            unitPrice:   { type: 'number', example: 129.99 },
            quantity:    { type: 'integer', minimum: 1, example: 2 },
            currency:    { type: 'string', example: 'USD', default: 'USD' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id:                     { type: 'string', format: 'uuid' },
            orderNumber:            { type: 'string', example: 'ORD-LB4X2A-K9MZ' },
            status:                 { type: 'string', enum: ['draft','pending','confirmed','processing','completed','cancelled'] },
            customerName:           { type: 'string', example: 'Kwame Mensah' },
            customerPhone:          { type: 'string', example: '+233244123456' },
            customerEmail:          { type: 'string', example: 'kwame@example.com' },
            customerLocation:       { type: 'string', example: 'Accra, Ghana' },
            additionalInstructions: { type: 'string', nullable: true },
            subtotal:               { type: 'number', example: 297.47 },
            totalAmount:            { type: 'number', example: 297.47 },
            currency:               { type: 'string', example: 'USD' },
            submittedAt:            { type: 'string', format: 'date-time', nullable: true },
            createdAt:              { type: 'string', format: 'date-time' },
            updatedAt:              { type: 'string', format: 'date-time' },
            items:                  { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
          },
        },
        OrderInput: {
          type: 'object',
          required: ['customerName','customerPhone','customerEmail','customerLocation','items'],
          properties: {
            customerName:           { type: 'string', example: 'Kwame Mensah' },
            customerPhone:          { type: 'string', example: '+233244123456' },
            customerEmail:          { type: 'string', example: 'kwame@example.com' },
            customerLocation:       { type: 'string', example: 'Accra, Ghana' },
            additionalInstructions: { type: 'string', nullable: true, example: 'Call before delivery' },
            items: {
              type: 'array',
              minItems: 1,
              items: { $ref: '#/components/schemas/OrderItemInput' },
            },
          },
        },
        OrderSummary: {
          type: 'object',
          properties: {
            itemCount:   { type: 'integer', example: 2 },
            totalQty:    { type: 'integer', example: 5 },
            subtotal:    { type: 'number', example: 297.47 },
            totalAmount: { type: 'number', example: 297.47 },
            currency:    { type: 'string', example: 'USD' },
          },
        },
        OrderPreview: {
          type: 'object',
          properties: {
            preview:  { type: 'boolean', example: true },
            customer: {
              type: 'object',
              properties: {
                customerName:           { type: 'string' },
                customerPhone:          { type: 'string' },
                customerEmail:          { type: 'string' },
                customerLocation:       { type: 'string' },
                additionalInstructions: { type: 'string', nullable: true },
              },
            },
            items:   { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
            summary: { $ref: '#/components/schemas/OrderSummary' },
            message: { type: 'string', example: 'This is a preview. Submit the order to confirm.' },
          },
        },
        OrderResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data:    { $ref: '#/components/schemas/Order' },
          },
        },
        PaginatedOrders: {
          type: 'object',
          properties: {
            success:    { type: 'boolean', example: true },
            data:       { type: 'array', items: { $ref: '#/components/schemas/Order' } },
            pagination: { $ref: '#/components/schemas/Pagination' },
          },
        },

        // ── Shared ────────────────────────────────────────────────────────
        Pagination: {
          type: 'object',
          properties: {
            total:      { type: 'integer', example: 50 },
            page:       { type: 'integer', example: 1 },
            limit:      { type: 'integer', example: 10 },
            totalPages: { type: 'integer', example: 5 },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);