'use strict';

const { Router } = require('express');
const authRoutes = require('./auth.routes');
const productsRoutes = require('./products.routes');
const productsPricesRoutes = require('./pricesRoute.routes');


const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productsRoutes);
router.use('/productprices', productsPricesRoutes);



// Additional route modules will be registered here:
// router.use('/tenders',  tenderRoutes);
// router.use('/bids',     bidRoutes);

module.exports = router;
