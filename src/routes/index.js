'use strict';

const { Router } = require('express');
const authRoutes = require('./auth.routes');
const productsRoutes = require('./products.routes');
const productsPricesRoutes = require('./pricesRoute.routes');
const categoryRoutes = require('./category.routes');


const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productsRoutes);
router.use('/productprices', productsPricesRoutes);
router.use('/category', categoryRoutes);



// Additional route modules will be registered here:
// router.use('/tenders',  tenderRoutes);
// router.use('/bids',     bidRoutes);

module.exports = router;
