const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const users = {};

io.on("connection", (socket) => {
  console.log(`🟢 Usuario conectado ${socket.id}`);

  socket.on("join-room", () => {
    users[socket.id] = socket.id;

    socket.broadcast.emit("user-connected", socket.id);
  });

  socket.on("signal", ({ to, from, data }) => {
    io.to(to).emit("signal", { from, data });
  });

  socket.on("disconnect", () => {
    console.log(`🔴 Usuario desconectado ${socket.id}`);
    delete users[socket.id];
    socket.broadcast.emit("user-disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});