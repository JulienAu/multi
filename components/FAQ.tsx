'use client'

import { useState } from 'react'

const FAQS = [
  {
    q: "Qu'est-ce qu'un ARS (Agentic Revenue System) ?",
    a: "C'est une équipe d'agents IA qui opère votre business 24h/24 : acquisition, marketing, support, reporting. Vous devenez l'Architecte, vous pilotez sans exécuter.",
  },
  {
    q: 'Comment fonctionne le BUSINESS.md ?',
    a: "C'est votre document stratégique généré à partir de vos 12 réponses. Il sert de source de vérité unique pour tous vos agents IA. Il contient votre positionnement, votre stratégie d'acquisition, vos cibles, et vos contraintes.",
  },
  {
    q: 'Puis-je modifier mon BUSINESS.md après génération ?',
    a: 'Absolument. Une fois abonné, vous accédez à un éditeur complet. Chaque modification est immédiatement prise en compte par vos agents.',
  },
  {
    q: 'Quels modèles IA sont utilisés ?',
    a: 'MULTI utilise les meilleurs modèles disponibles via OpenRouter : Claude, GPT-4o, et autres. Le modèle est automatiquement sélectionné selon la tâche pour optimiser qualité et coût.',
  },
  {
    q: "Est-ce que mes données sont sécurisées ?",
    a: "Oui. Vos données sont chiffrées, stockées en Europe, et jamais partagées. Conformité RGPD complète. Vous pouvez demander la suppression à tout moment.",
  },
  {
    q: 'Puis-je annuler mon abonnement ?',
    a: 'Oui, à tout moment. Pas de période d\'engagement. Vos agents s\'arrêtent à la fin de la période payée et vos données restent accessibles 30 jours.',
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="max-w-2xl mx-auto">
      <h2 className="text-xl font-medium text-ui-text-primary mb-6 text-center">
        Questions fréquentes
      </h2>

      <div className="space-y-2">
        {FAQS.map((faq, i) => (
          <div key={i} className="border border-ui-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-ui-bg-secondary transition-colors"
            >
              <span className="text-sm font-medium text-ui-text-primary pr-4">
                {faq.q}
              </span>
              <span className="text-ui-text-tertiary shrink-0 text-lg">
                {openIndex === i ? '\u2212' : '+'}
              </span>
            </button>
            {openIndex === i && (
              <div className="px-4 pb-3 animate-fade-up">
                <p className="text-sm text-ui-text-secondary leading-relaxed">
                  {faq.a}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
