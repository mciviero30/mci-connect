import React from 'react';
import FieldPhotosView from '../FieldPhotosView.jsx';

export default function PhotosPanel({ job }) {
  return (
    <FieldPhotosView jobId={job.id} />
  );
}