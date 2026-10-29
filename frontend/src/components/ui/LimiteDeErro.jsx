import { Component } from 'react';

/**
 * Error boundary: um erro de renderização dentro dele mostra `alternativa(tentarDeNovo)` no lugar
 * dos filhos, sem derrubar o resto da tela. Usado em cada bloco do Painel.
 */
export class LimiteDeErro extends Component {
  constructor(props) {
    super(props);
    this.state = { falhou: false };
    this.tentarDeNovo = this.tentarDeNovo.bind(this);
  }

  static getDerivedStateFromError() {
    return { falhou: true };
  }

  tentarDeNovo() {
    this.props.aoTentarDeNovo?.();
    this.setState({ falhou: false });
  }

  render() {
    return this.state.falhou ? this.props.alternativa(this.tentarDeNovo) : this.props.children;
  }
}
