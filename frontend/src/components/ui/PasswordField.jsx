import { useState } from 'react';
import { IconButton } from './Button';
import { TextField } from './FormField';

export function PasswordField(props) {
  const [visivel, setVisivel] = useState(false);

  return (
    <TextField
      {...props}
      type={visivel ? 'text' : 'password'}
      acao={
        <IconButton
          icone={visivel ? 'olhoFechado' : 'olho'}
          rotulo={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visivel}
          aria-controls={props.id}
          onClick={() => setVisivel((atual) => !atual)}
        />
      }
    />
  );
}
