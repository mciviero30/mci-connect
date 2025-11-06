import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Redirect to CrearEstimado with id parameter for editing
export default function EditarEstimado() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  
  React.useEffect(() => {
    if (id) {
      navigate(createPageUrl(`CrearEstimado?id=${id}`), { replace: true });
    } else {
      navigate(createPageUrl('Estimados'), { replace: true });
    }
  }, [id, navigate]);

  return null;
}