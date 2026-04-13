const imageService = require('../services/image.service');

/**
 * Image Controller — functional module
 * Handles HTTP request/response logic; delegates all work to imageService.
 */

const upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided. Use field name "image".',
      });
    }

    const saved = await imageService.saveImage(req.file);

    return res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      data: saved,
    });
  } catch (err) {
    console.error('Upload error:', err.message);
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

const getAll = async (req, res) => {
  try {
    const images = await imageService.getAllImages();
    return res.status(200).json({ success: true, count: images.length, data: images });
  } catch (err) {
    console.error('GetAll error:', err.message);
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const image = await imageService.getImageById(req.params.id);
    const { data: _data, ...meta } = image;  // strip binary from JSON response

    return res.status(200).json({
      success: true,
      data: imageService.formatMetadata(meta),
    });
  } catch (err) {
    console.error('GetById error:', err.message);
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

const download = async (req, res) => {
  try {
    const image = await imageService.getImageById(req.params.id);

    res.setHeader('Content-Type', image.mimetype);
    res.setHeader('Content-Length', image.size);
    res.setHeader('Content-Disposition', `inline; filename="${image.filename}"`);

    return res.end(image.data);
  } catch (err) {
    console.error('Download error:', err.message);
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const result = await imageService.deleteImage(req.params.id);
    return res.status(200).json({ success: true, message: result.message, data: { id: result.id } });
  } catch (err) {
    console.error('Delete error:', err.message);
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

module.exports = { upload, getAll, getById, download, remove };