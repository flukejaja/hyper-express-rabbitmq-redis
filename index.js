const HyperExpress = require("hyper-express");
const app = new HyperExpress.Server();
const redis = require("redis");
const amqp = require("amqplib");

const rabbitMqUrl = "amqp://localhost";
const redisClient = redis.createClient();
const redisQueueName = "users";

app.get("/", async (_, response) => {
  const res = await redisClient.lRange(redisQueueName, 0, -1);
  let users = [];
  for (let i = 0; i < res.length; i++) {
    users.push(JSON.parse(res[i]));
  }
  return response.send(JSON.stringify(users, null, 2));
});

app.post("/user", async (request, response) => {
  try {
    const { name, pass } = await request.json();
    const conn = await amqp.connect(rabbitMqUrl);
    const channel = await conn.createChannel();
    const queueName = "myQueue";

    await channel.assertQueue(queueName, { durable: false });
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify({ name, pass })));

    await channel.close();
    await conn.close();

    response.status(200).send("Data sent successfully");
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app
  .listen(1112)
  .then((socket) => console.log("Webserver started on port 1112"))
  .catch((error) => console.log("Failed to start webserver on port 1112"));

async function consumeAndStoreInRedis() {
  try {
    const connection = await amqp.connect("amqp://localhost");
    const channel = await connection.createChannel();

    await redisClient.connect();

    const rabbitMqQueue = "myQueue";
    await channel.assertQueue(rabbitMqQueue, { durable: false });

    redisClient.del(redisQueueName);

    channel.consume(rabbitMqQueue, (msg) => {
      if (msg !== null) {
        const messageContent = msg.content.toString();
        redisClient.rPush(redisQueueName, messageContent);
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

consumeAndStoreInRedis();
