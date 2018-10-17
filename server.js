require('dotenv').config();

const bodyParser = require('body-parser');
const pgp = require('pg-promise')();
const express = require('express');
const app = express();
const db = pgp({
    host: 'localhost',
    port: 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD
});

app.use(bodyParser.json());

// app.get('/api/songs', function(req, res){
//     db.any('SELECT * FROM song')
//       .then(function(data) {
//           res.json(data);
//       })
//       .catch(function(error) {
//           res.json({error: error.message});
//       });
// });

app.post('/api/songs', function(req, res){
  // using destructing assignment to
  // extract properties into variables
  const {artistId, title, year} = req.body;
  // ES6 strings for multiline
  db.one(`INSERT INTO song(artist_id, title, year)
          VALUES($1, $2, $3) RETURNING id`, [artistId, title, year])
    .then(data => {
      return data.id;
    })
    .then((songId) => db.one(`SELECT song.id, artist.name, song.title FROM song, artist WHERE artist.id = $1 AND song.id = $2`, [artistId, songId])
    .then(data => {
      res.json({id: data.id, artist: data.name, title: data.title})
    }))
    .catch(error => {
      res.json({
        error: error.message
      });
    });  
});

app.get('/api/artists', function(req,res) {
  db.any('SELECT * FROM artist')
  .then(function(data) {
    res.json(data);
})
  .catch(function(error) {
      res.json({error: error.message});
  });
});

app.get('/api/songs', function(req, res){
  db.any('SELECT song.id, artist.name, title, year FROM song, artist where song.artist_id = artist.id')
  .then(function(data){
    res.json(data);
  })
  .catch(function(error){
      res.json({error: error.message});
  })
});

app.get('/api/songs/:id', function(req, res){
  const songId = req.params.id;
  db.any('SELECT song.id, artist.name, title FROM song, artist WHERE song.artist_id = artist.id AND song.id=$1', [songId])
  .then(function(data){
    res.json(data);
  })
  .catch(function(error){
      res.json({error: error.message});
  });
});

app.get('/api/playlists', (req,res) => {
  db.any('SELECT * FROM playlist')
  .then(data => res.json(data))
  .catch(error => {
      res.json({error: error.message})})
  });

  app.post('/api/playlists', (req,res) => {
    const { name } = req.body;
    db.one(`INSERT INTO playlist (name) VALUES ($1) RETURNING id`,[name])
      .then(data => res.json({ id: data.id, name}))
      .catch(error => {
        res.json({error: error.message})})
  });

  app.post('/api/playlists/:playlistId/songs', (req, res)=>{
    const {songId} = req.body;
    db.one(`INSERT INTO song_playlist (song_id, playlist_id) VALUES ($1, $2)`, [songId, req.params.playlistId])
    .then(data => res.json(data))
    .catch(error => {
        res.json({error: error.message})})
  })

 app.post('/api/artists', (req, res)=> {
  const {name, email} = req.body;
   db.one(`INSERT INTO artist(name, email)
   VALUES($1, $2) RETURNING id`, [name, email])
   .then(data =>{
    res.json(Object.assign({}, {id: data.id}, req.body));
   })
   .catch(error => {
    res.json({
      error: error.message
    });
  })
 });

 app.delete('/api/playlists/:id/songs/:songId', (req,res) => {
  db.one(`DELETE FROM song_playlist WHERE playlist_id = $1 AND song_id = $2`, [req.params.id,req.params.songId])
  .then(data => res.json(data))
  .catch(error => {
      res.json({error: error.message})})
 });

 app.delete('/api/playlists/:id', (req, res)=>{
   db.any(`DELETE FROM song_playlist WHERE playlist_id = $1`, [req.params.id])
   .then(()=> db.one(`DELETE FROM playlist WHERE id = $1`, [req.params.id]))
   .catch(error => {
    res.json({error: error.message})})
 });

 app.patch('/api/artists/:id', (req,res) => {
    const name = (req.body.hasOwnProperty('name')) ? req.body.name : '';
    const name_str = (name !== '') ? `name = $1` : '';
  
    const email = (req.body.hasOwnProperty('email')) ? req.body.email : '';
    const email_str = (email !== '') ? `email = $2` : '';

    const comma = (name !== '' && email !== '') ? ',' : '';

    const id = req.params.id;

    db.one(`UPDATE artist SET ${name_str} ${comma} ${email_str} WHERE id = $3`, [name,email,id])
      .then(data => res.json(data))
      .catch(error => {
          res.json({error: error.message})});    
 });

 app.patch('/api/playlists/:id', (req, res)=>{
   const {name} = req.body; 
   db.one(`UPDATE playlist SET name = $1 WHERE id=$2`, [name, req.params.id])
   .then(data => res.json(data))
      .catch(error => {
          res.json({error: error.message})});   
 });

 app.delete('/api/song/:id', (req,res)=> {
  db.any(`DELETE FROM song_playlist WHERE song_id = $1`, [req.params.id])
  .then(()=>db.one(`DELETE FROM song WHERE id = $1`, [req.params.id]))
  .then(data => res.json(data))
  .catch(error => {
    res.json({error: error.message})});  
 });

 app.delete('/api/artists/:id', (req, res)=>{
   db.any(`SELECT song.id FROM song, song_playlist WHERE song.id = song_playlist.song_id AND artist_id = $1`, [req.params.id])
    .then(data => data.forEach(element => db.one(`DELETE FROM song_playlist WHERE song_id = $1`, [element.id])))
    .then(()=> db.any(`DELETE FROM song WHERE artist_id = $1`, [req.params.id]))
    .then(()=> db.one(`DELETE FROM artist WHERE id= $1`, [req.params.id]))
    .catch(error => {
      res.json({error: error.message})});  
 })

app.listen(8080, function() {
  console.log('Listening on port 8080!');
});
