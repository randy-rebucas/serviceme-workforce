/* eslint-disable linebreak-style */
exports.get = async (req, res, next) => {
  try {
    res.render("index", {title: "service-me"});
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
