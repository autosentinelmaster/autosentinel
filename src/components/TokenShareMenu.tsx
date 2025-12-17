import { Share2, Copy, MessageCircle, Mail, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface TokenShareMenuProps {
  tokenCode: string;
  childName: string;
}

export function TokenShareMenu({ tokenCode, childName }: TokenShareMenuProps) {
  const shareUrl = `${window.location.origin}/child?token=${tokenCode}`;
  const shareMessage = `Hi ${childName}, here's your Auto Sentinel driving token: ${tokenCode}\n\nView details: ${shareUrl}`;

  const copyToken = () => {
    navigator.clipboard.writeText(tokenCode);
    toast.success('Token copied!');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied!');
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  const shareEmail = () => {
    window.open(`mailto:?subject=Your Auto Sentinel Driving Token&body=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Auto Sentinel Token',
          text: shareMessage,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      copyLink();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Share token">
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={copyToken}>
          <Copy className="h-4 w-4 mr-2" />
          Copy token
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyLink}>
          <Link className="h-4 w-4 mr-2" />
          Copy link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareWhatsApp}>
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareEmail}>
          <Mail className="h-4 w-4 mr-2" />
          Email
        </DropdownMenuItem>
        {navigator.share && (
          <DropdownMenuItem onClick={shareNative}>
            <Share2 className="h-4 w-4 mr-2" />
            More options
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}