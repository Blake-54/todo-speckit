const exports = {};

/** Feature 1: authenticated list read returns the caller's lists. Persistence ships in Feature 2. */
exports.findAll = async (req, res) => {
  res.send([]);
};

export default exports;
