import React from 'react';
import CameraStream from './compponents/CameraComponent/CameraStream';

const App: React.FC = () => {


  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      <h1>Camera + AI Viewer</h1>
      <CameraStream />
    </div>
  );
};

export default App;
