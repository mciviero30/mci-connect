import React from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function QuoteWhatsApp({ quote }) {
  const { language } = useLanguage();

  const handleWhatsApp = () => {
    if (!quote.customer_phone) return;

    // Clean phone number
    let phone = quote.customer_phone.replace(/\D/g, '');
    if (!phone.startsWith('1') && phone.length === 10) {
      phone = '1' + phone; // Add US country code
    }

    // Create message
    const itemsList = quote.items?.map(item => 
      `• ${item.quantity} ${item.unit || 'x'} ${item.description || item.item_name} - $${item.total?.toFixed(2)}`
    ).join('\n') || '';

    const message = language === 'es'
      ? `Hola ${quote.customer_name}! 👋

Le envío el estimado *${quote.quote_number}* para el proyecto *${quote.job_name}*.

📋 *Resumen:*
${itemsList}

💰 *Total: $${quote.total?.toLocaleString()}*

📅 Válido hasta: ${format(new Date(quote.valid_until), 'd MMMM yyyy', { locale: es })}

¿Tiene alguna pregunta? Estoy a su disposición.

_MODERN COMPONENTS INSTALLATION_`
      : `Hello ${quote.customer_name}! 👋

Here's quote *${quote.quote_number}* for the *${quote.job_name}* project.

📋 *Summary:*
${itemsList}

💰 *Total: $${quote.total?.toLocaleString()}*

📅 Valid until: ${format(new Date(quote.valid_until), 'MMMM d, yyyy')}

Any questions? I'm happy to help!

_MODERN COMPONENTS INSTALLATION_`;

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (!quote.customer_phone) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleWhatsApp}
      className="bg-white border-green-400 text-green-700 hover:bg-green-50"
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      WhatsApp
    </Button>
  );
}