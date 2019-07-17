const express = require('express');
const app = express();
const multer = require('multer');
const upload = multer({
  dest: __dirname + '/uploads/',
});
const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use('/images', express.static(__dirname + '/uploads'));

const threads = [];
const messages = {};
const passwordsAssoc = {};
const sessions = {};

const h = (element, children) => {
  return (
    '<' +
    element +
    '>' +
    children.join('\n') +
    '</' +
    element.split().pop() +
    '>'
  );
};

const makePage = (user) => {
  const threadElements = threads.map((post) => {
    const threadCount = threads.filter((thread) => thread.user === post.user)
      .length;
    return `<div><h2>${post.desc}</h2><h4 style="color:${post.user.color ||
      ''};">${post.user.username} ${threadCount}</h4>${
      post.path ? `<img src=${post.path} />` : ''
    }</div>`;
  });
  const messageElements = messages[user.username].map((msg) =>
    h('li', [
      h(
        `span onclick="setRecipient('${
          msg.sender.username
        }')" style="color:${msg.sender.color || ''};"`,
        [msg.sender.username]
      ),
      ' : ',
      h('span', [msg.content]),
    ])
  );
  return h('html', [
    h('body', [
      h(`div style="color:${user.color || ''};"`, [`${user.username}`]),
      h('h1', ['Threads']),
      h('div', threadElements),
      h('form action="/thread" method="POST" enctype="multipart/form-data"', [
        h('label', [
          'Description',
          h('input type="text" name="description"', []),
        ]),
        h('label', ['Image', h('input type="file" name="image"', [])]),
        h('input type="submit"', []),
      ]),
      h(
        'form action="/set/username" method="POST" enctype="multipart/form-data"',
        [
          h('label', ['Username', h('input type="text" name="username"', [])]),
          h('input type="submit"', []),
        ]
      ),
      h(
        'form action="/set/color" method="POST" enctype="multipart/form-data"',
        [
          h('label', [
            'Username color',
            h('input type="text" name="color"', []),
          ]),
          h('input type="submit"', []),
        ]
      ),
      h('h1', ['My messages']),
      h('ul', messageElements),
      h('h1', ['Send Message']),
      h('form action="/message" method="POST" enctype="multipart/form-data"', [
        h('label', [
          'Username',
          h('input type="text" name="recipient" id="recipient"', []),
        ]),
        h('label', ['Message', h('input type="text" name="message"', [])]),
        h('input type="submit"', []),
      ]),
      h('script', [
        'function setRecipient(recipient) { document.getElementById("recipient").value = recipient; }',
      ]),
    ]),
  ]);
};

app.post('/thread', upload.single('image'), (req, res) => {
  console.log('creating a new thread', req.body);
  const sessionId = req.cookies.sid;
  const user = sessions[sessionId];
  if (!user) {
    return res.send('Need to login');
  }
  const file = req.file;
  threads.push({
    path: file ? `/images/${file.filename}` : '',
    user,
    desc: req.body.description,
  });
  res.send(makePage(user));
});

app.post('/set/username', upload.none(), (req, res) => {
  const newUsername = req.body.username;
  const sessionId = req.cookies.sid;
  const user = sessions[sessionId];
  const oldUsername = user.username;
  user.username = newUsername;
  passwordsAssoc[newUsername] = passwordsAssoc[oldUsername];
  delete passwordsAssoc[oldUsername];
  messages[user.username] = messages[oldUsername];
  delete messages[oldUsername];
  res.send(makePage(user));
});

app.post('/set/color', upload.none(), (req, res) => {
  const sessionId = req.cookies.sid;
  const user = sessions[sessionId];
  const color = req.body.color;
  user.color = color;
  res.send(makePage(user));
});

app.post('/login', upload.none(), (req, res) => {
  console.log('request to /login', req.body);
  if (passwordsAssoc[req.body.username] !== req.body.password) {
    res.send('<html><body> invalid username or password </body></html>');
    return;
  }
  let sessionId = '' + Math.floor(Math.random() * 1000000);
  sessions[sessionId] = {
    username: req.body.username,
    color: 'black',
  };
  res.cookie('sid', sessionId);
  res.send(makePage(sessions[sessionId]));
});

app.post('/signup', upload.none(), (req, res) => {
  console.log('request to /signup', req.body);
  const username = req.body.username;
  if (passwordsAssoc[username]) {
    return res.send('<html><body> Username taken </body></html>');
  }
  passwordsAssoc[username] = req.body.password;
  messages[username] = [];
  console.log(messages);
  res.send('<html><body> signup successful </body></html>');
});

app.post('/message', upload.none(), (req, res) => {
  const sessionId = req.cookies.sid;
  const user = sessions[sessionId];
  const message = req.body.message;
  const recipient = req.body.recipient;
  if (!passwordsAssoc[recipient]) {
    return res.send('<html><body> User does not exist </body></html>');
  }
  messages[recipient].push({ sender: user, content: message });
  res.send(makePage(user));
});

app.get('/', (req, res) => {
  const sessionId = req.cookies.sid;
  const user = sessions[sessionId];
  console.log(sessionId, sessions);
  if (user) {
    return res.send(makePage(user));
  }
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(4000, () => {
  console.log('server started');
});
