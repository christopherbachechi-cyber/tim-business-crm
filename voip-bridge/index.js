require('./env');
const { startAmiListener } = require('./ami-listener');
const { startRecordingServer } = require('./recording-server');

startAmiListener();
startRecordingServer();
