import { useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../hooks/useAuth'

export default function AdminQrMesas() {
  const { perfil, sair } = useAuth()
  const [url, setUrl] = useState(
    typeof window !== 'undefined' ? window.location.origin : ''
  )

  const urlLimpa = url.trim()
  const urlValida = /^https?:\/\/.+/i.test(urlLimpa)

  return (
    <div className="min-h-screen bg-arraia-cream">
      {/* Controles — some na impressão */}
      <header className="bg-arraia-brown-dark text-arraia-cream px-4 py-3 flex items-center justify-between flex-wrap gap-2 print:hidden">
        <div>
          <Link to="/admin" className="text-xs opacity-80 hover:opacity-100 block">
            ← voltar
          </Link>
          <h1 className="font-bold text-lg">QR das mesas</h1>
          <p className="text-xs opacity-80">Olá, {perfil?.nome}</p>
        </div>
        <button
          onClick={sair}
          className="text-xs bg-arraia-cream/10 hover:bg-arraia-cream/20 rounded px-3 py-1"
        >
          Sair
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        <section className="bg-white rounded-xl shadow-sm p-4 space-y-3 print:hidden">
          <label className="block">
            <span className="text-sm font-semibold text-arraia-brown-dark">
              Endereço do site (o que o QR vai abrir)
            </span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://seu-site.vercel.app"
              className="mt-1 w-full border border-arraia-brown/20 rounded px-3 py-2 text-sm"
            />
            <span className="text-xs text-arraia-brown/60 mt-1 block">
              Preenchido automaticamente com o endereço deste site. Só mude se
              quiser apontar para outro.
            </span>
          </label>

          <button
            onClick={() => window.print()}
            disabled={!urlValida}
            className="bg-arraia-red text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Imprimir cartaz
          </button>
          <p className="text-xs text-arraia-brown/60">
            Dica: na janela de impressão, escolha a quantidade de cópias =
            número de mesas. Todas as mesas usam o mesmo QR.
          </p>
        </section>

        {/* Cartaz — é isso que sai na impressão */}
        <section className="bg-white rounded-xl shadow-sm border-4 border-arraia-gold p-8 text-center flex flex-col items-center gap-5 print:border-2 print:shadow-none print:min-h-screen print:justify-center">
          <div>
            <p className="text-arraia-red font-bold uppercase tracking-widest text-sm">
              Arraiá de São Sebastião
            </p>
            <h2 className="text-3xl font-extrabold text-arraia-brown-dark mt-1">
              Faça seu pedido pelo celular
            </h2>
          </div>

          {urlValida ? (
            <div className="bg-white p-4 border-4 border-arraia-brown-dark rounded-2xl">
              <QRCodeSVG value={urlLimpa} size={280} level="M" />
            </div>
          ) : (
            <p className="text-arraia-red text-sm py-20">
              Informe um endereço válido (começando com http).
            </p>
          )}

          <ol className="text-left text-arraia-brown-dark text-lg space-y-1 font-medium">
            <li>1. Aponte a câmera do celular para o código</li>
            <li>2. Escolha suas comidas e bebidas</li>
            <li>3. Pague pelo PIX e vá ao caixa retirar</li>
          </ol>

          <p className="text-arraia-brown/60 text-sm break-all max-w-md">
            {urlLimpa}
          </p>
        </section>
      </main>
    </div>
  )
}
