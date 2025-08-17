// controllers/fileController.js
import express from 'express';
import * as fileService from '../services/fileService.js';

const router = express.Router();

// GET /api/files/keyword/:keyword
router.get('/keyword/:keyword', async (req, res) => {
  const results = await fileService.findByKeyword(req.params.keyword);
  res.json({ count: results.length, results });
});

// GET /api/files/time/:time
router.get('/time/:time', async (req, res) => {
  const results = await fileService.findByTime(req.params.time);
  res.json({ count: results.length, results });
});

// GET /api/files/description/:desc
router.get('/description/:desc', async (req, res) => {
  const results = await fileService.findByDescription(req.params.desc);
  res.json({ count: results.length, results });
});

// GET /api/files/parent/:parent
router.get('/parent/:parent', async (req, res) => {
  const results = await fileService.findByParentName(req.params.parent);
  res.json({ count: results.length, results });
});

// GET /api/files/type/:type
router.get('/type/:type', async (req, res) => {
  const results = await fileService.findByType(req.params.type);
  res.json({ count: results.length, results });
});

export default router;
