import express from 'express';
import { getPlots, getPlot, createPlot, updatePlot, deletePlot, getAvailablePlots, updatePlotStatus, getPlotMapData } from '../controllers/plotController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();

router.get('/', getPlots);
router.get('/available', getAvailablePlots);
router.get('/map', getPlotMapData);
router.get('/:id', getPlot);

router.post('/', protect, authorize('super_admin', 'company_admin'), createPlot);
router.put('/:id', protect, authorize('super_admin', 'company_admin'), updatePlot);
router.delete('/:id', protect, authorize('super_admin', 'company_admin'), deletePlot);
router.patch('/:id/status', protect, authorize('super_admin', 'company_admin', 'sales_executive'), updatePlotStatus);

export default router;
