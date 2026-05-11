// Set NODE_ENV before any Nest module is imported so the early-return guards
// in Kafka producer/consumers and other external integrations trip cleanly.
process.env.NODE_ENV = 'test';
// Silences the noisy kafkajs partitioner notice that fires on every import.
process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';
