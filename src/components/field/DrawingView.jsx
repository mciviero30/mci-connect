import React, { useState } from 'react';
import TaskPin from './TaskPin';
import TaskDetailPanelSimple from './TaskDetailPanelSimple';

const PANEL_WIDTH = 320;

export default function DrawingView({ jobId, blueprintUrl }) {
  // Estado para lista de tareas
  const [tasks, setTasks] = useState([
    {
      id: '1',
      title: 'Wall 001',
      status: 'pending',
      priority: 'high',
      pin_x: 25,
      pin_y: 30,
      description: 'Install glass wall',
    },
    {
      id: '2',
      title: 'Wall 002',
      status: 'in_progress',
      priority: 'medium',
      pin_x: 60,
      pin_y: 45,
      description: 'Install solid wall',
    },
  ]);

  // Estado para el pin seleccionado
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Función para manejar el click en un pin
  const handlePinClick = (task) => {
    console.log('🎯 handlePinClick llamado con:', task.id, task.title);
    
    if (selectedTaskId === task.id) {
      // Si ya está seleccionado, deseleccionar (cerrar modal)
      console.log('❌ Deseleccionando task:', task.id);
      setSelectedTaskId(null);
    } else {
      // Si no está seleccionado, seleccionar (abrir modal)
      console.log('✅ Seleccionando task:', task.id);
      setSelectedTaskId(task.id);
    }
  };

  // Obtener la tarea seleccionada
  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  const isPanelOpen = !!selectedTask;

  return (
    <div className="relative w-full h-full flex overflow-hidden">
      {/* Área del dibujo/blueprint */}
      <div 
        className="relative bg-slate-900 overflow-hidden transition-all duration-300"
        style={{
          width: isPanelOpen ? `calc(100% - ${PANEL_WIDTH}px)` : '100%'
        }}
      >
        {/* Imagen del blueprint */}
        <img 
          src={blueprintUrl}
          alt="Blueprint"
          className="w-full h-full object-contain z-0"
          draggable={false}
        />

        {/* Capa de pines superpuesta */}
        <div className="absolute inset-0 pointer-events-none z-20">
          <div className="relative w-full h-full pointer-events-auto">
            {tasks.map((task) => (
              <TaskPin
                key={task.id}
                task={task}
                onClick={handlePinClick}
                isSelected={selectedTaskId === task.id}
                isErasing={false}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Panel lateral - Solo se muestra si hay un pin seleccionado */}
      {selectedTask && (
        <TaskDetailPanelSimple
          task={selectedTask}
          onClose={() => {
            console.log('❌ Cerrando panel');
            setSelectedTaskId(null);
          }}
          jobId={jobId}
        />
      )}
    </div>
  );
}