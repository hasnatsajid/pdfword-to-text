const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const pdf = require('pdf-parse');
const WordExtractor = require('word-extractor');

const app = express();
const router = express.Router();

let essays = '';

const css = fs.readFileSync('./style.css', 'utf8');

const createHtml = (css, essays) => {
  return `<style>${css}</style><div class="wrapper">
<form action="/" id="uploadForm" enctype="multipart/form-data" method="post">
  <div class="files">
    <label for="files">+ Upload Essays</label>
    <input type="file" multiple name="multi-files" id="files" />
    <p>Max File size</p>
  </div>

  <div class="review-edit">
    <input type="submit" value="Review & Edit" />
  </div>
</form>
${essays}
</div>`;
};

const createEssay = (essayName, essayText) => {
  return `<div class="essay">
  <p>${essayName}</p>
  <textarea name="" id="" cols="90" rows="10">${essayText}</textarea>
</div>`;
};

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 },
  fileFilter(req, file, cb) {
    // Allowed ext
    const filetypes = /docx|pdf/;

    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Only PDF & Docx files allowed!');
    }
  },
});

// uploading multiple images together
app.post('/', upload.array('multi-files', 200), (req, res) => {
  try {
    fs.readdir(`${__dirname}/uploads`, function (err, files) {
      if (err) {
        onError(err);
        return;
      }
      essays = '';
      files.forEach((file) => {
        const fileChecker = file.slice(-5);
        let essayName;

        if (fileChecker.includes('pdf')) {
          essayName = file.slice(0, -4);
          let dataBuffer = fs.readFileSync(`${__dirname}/uploads/${file}`);

          pdf(dataBuffer).then(function (data) {
            // console.log(data.text);
            essays += createEssay(essayName, data.text);
          });
        }

        if (fileChecker.includes('docx')) {
          essayName = file.slice(0, -5);
          const extractor = new WordExtractor();
          const extracted = extractor.extract(`${__dirname}/uploads/${file}`);

          extracted.then(function (doc) {
            essays += createEssay(essayName, doc.getBody());

            // console.log(doc.getBody());
          });
        }
      });
    });

    // res.render(`<p>hello dear</p>`);
    const html = createHtml(css, essays);

    res.send(html);
  } catch (error) {
    console.log(error);
    res.send(400);
  }
});

app.get('/', (req, res) => {
  // res.sendFile(__dirname + '/views/index.html');
  const html = createHtml(css, '');
  res.send(html);
});

app.listen(process.env.PORT || 3000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});