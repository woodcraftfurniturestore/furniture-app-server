const swaggerAutogen = require('swagger-autogen')();
const outputFile = './swagger-output.json';
const endpointsFiles = [
    './routes/adminRoutes.js',
    './routes/authRoutes.js',
    './routes/cartRoutes.js',
    './routes/productRoutes.js'
];
const doc = {
    info: {
        version: "1.0.0",
        title: "E-commerce API",
        description: "Documentation for E-commerce Application API"
    },
    host: "localhost:8080",
    basePath: "/api",
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
        {
            name: "Admin",
            description: "Endpoints for admin operations"
        },
        {
            name: "Auth",
            description: "Endpoints for authentication"
        },
        {
            name: "Cart",
            description: "Endpoints for cart and order operations"
        },
        {
            name: "Product",
            description: "Endpoints for product operations"
        }
    ],
}
swaggerAutogen(outputFile, endpointsFiles, doc);