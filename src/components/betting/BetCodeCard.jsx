// Trong hàm BetCodeCard, thay đổi phần handleConfirm
import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Edit,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp,
  Clock,
  Tag,
  DollarSign,
  Award,
  Copy,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useBetCode } from '@/contexts/BetCodeContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import BetCodeDetailModal from './BetCodeDetailModal';
import { formatMoney } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { useBetConfig } from '@/contexts/BetConfigContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const BetCodeCard = ({
  betCode,
  selectable = false,
  selected = false,
  onSelectChange = null,
}) => {
  const { removeDraftCode, confirmDraftCode, isSavingDraftCode } = useBetCode();

  const [showDetails, setShowDetails] = useState(false);
  const [showFullCode, setShowFullCode] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const betConfig = useBetConfig();

  const handleRemove = () => {
    removeDraftCode(betCode.id);
    toast.success('Đã xóa mã cược');
  };

  const handleConfirmClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    setShowConfirmDialog(false);
    setIsSaving(true);
    confirmDraftCode(betCode.id);
  };

  const handleCopyText = () => {
    try {
      navigator.clipboard.writeText(betCode.originalText || '').then(() => {
        setIsCopied(true);
        toast.success('Đã sao chép mã cược');

        // Auto reset after 2 seconds
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      });
    } catch (err) {
      toast.error('Sao chép thất bại');
      console.error('Copy failed', err);
    }
  };

  const handleOpenDetail = () => setIsDetailOpen(true);
  const handleCloseDetail = () => setIsDetailOpen(false);

  // Format date
  const formattedDate = betCode.createdAt
    ? format(new Date(betCode.createdAt), 'HH:mm dd/MM/yyyy')
    : 'N/A';

  // Get station display name
  const getStationDisplayName = () => {
    if (!betCode.station) return 'Đài không xác định';

    let displayName = betCode.station.name || 'Đài không xác định';

    if (betCode.station.multiStation && betCode.station.count > 1) {
      displayName = `${displayName} (${betCode.station.count})`;
    }

    if (betCode.station.stations && betCode.station.stations.length > 0) {
      // Use Set to ensure unique station names
      const uniqueStations = [
        ...new Set(betCode.station.stations.map((s) => s.name)),
      ].join(', ');
      displayName = uniqueStations;
    }

    return displayName;
  };

  // Get original stake amount from the bet code
  const getOriginalStakeAmount = () => {
    if (!betCode.lines || !Array.isArray(betCode.lines)) return 0;

    // Sum up the original amount from all lines
    return betCode.lines.reduce((total, line) => {
      // Original amount in bet code is the base amount × 1000
      return total + (line.amount || 0);
    }, 0);
  };

  // Get all bet numbers from all lines
  const getAllNumbers = () => {
    if (!betCode.lines || !Array.isArray(betCode.lines)) return [];

    const allNumbers = [];
    betCode.lines.forEach((line) => {
      if (line.numbers && Array.isArray(line.numbers)) {
        // Add base numbers
        allNumbers.push(...line.numbers);

        // Add permutations if available
        line.numbers.forEach((number) => {
          // Check if number has permutations
          const perms =
            (line.permutations && line.permutations[number]) ||
            (betCode.permutations && betCode.permutations[number]) ||
            [];

          // Add all permutations except the original number (already added above)
          perms.forEach((perm) => {
            if (perm !== number && !allNumbers.includes(perm)) {
              allNumbers.push(perm);
            }
          });
        });
      }
    });

    return allNumbers;
  };

  // Get bet type names from the first line
  const getBetTypeNames = () => {
    if (
      !betCode.lines ||
      !Array.isArray(betCode.lines) ||
      betCode.lines.length === 0 ||
      !betCode.lines[0].betType
    ) {
      return 'N/A';
    }

    const line = betCode.lines[0];
    const betTypeAlias = line.betType.alias?.toLowerCase() || '';

    // Find full info from defaultBetTypes
    const betType = betConfig.betTypes.find((type) =>
      type.aliases.some((a) => a.toLowerCase() === betTypeAlias)
    );

    if (betType) {
      return `${betType.name} (${betTypeAlias})`;
    }

    return betTypeAlias || 'N/A';
  };

  const numbers = getAllNumbers();
  const betText = betCode.originalText || 'N/A';

  return (
    <>
      <Card
        className={cn(
          'transition-all hover:shadow-md',
          'border-primary/20 dark:border-primary/30',
          selected ? 'ring-2 ring-primary' : ''
        )}
      >
        <CardHeader className="py-3 px-4">
          <div className="flex justify-between items-center">
            <div className="flex items-start gap-2">
              {selectable && (
                <Checkbox
                  checked={selected}
                  onCheckedChange={onSelectChange}
                  className="mt-1"
                />
              )}

              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {getStationDisplayName()}
                  <Badge
                    variant="outline"
                    className="text-xs bg-primary/10 text-primary border-primary/20"
                  >
                    Mã cược
                  </Badge>
                </CardTitle>
                <div className="text-xs text-muted-foreground mt-1 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formattedDate}
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-4 py-0 pb-2 space-y-2">
          {/* Simplified bet code - always visible */}
          <div className="text-xs bg-muted p-2 rounded relative group">
            <pre className="whitespace-pre-wrap pr-8" onClick={handleCopyText}>
              {betText}
            </pre>

            {/* Copy button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCopyText}
            >
              {isCopied ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          {betText.length > 60 && (
            <Button
              variant="link"
              size="sm"
              className="px-1 h-5 text-xs"
              onClick={() => setShowFullCode(!showFullCode)}
            >
              {showFullCode ? 'Thu gọn' : 'Xem đầy đủ'}
            </Button>
          )}

          {/* Key information in a compact form */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1 text-sm">
            <div className="flex items-center gap-1">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Kiểu cược:</span>{' '}
              <span className="font-medium">{getBetTypeNames()}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Tiền đặt:</span>{' '}
              <span className="font-medium">
                {formatMoney(getOriginalStakeAmount())}đ
              </span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
              <span className="text-muted-foreground">Tiền đóng:</span>{' '}
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {formatMoney(betCode.stakeAmount || 0)}đ
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Award className="h-3.5 w-3.5 text-green-500 dark:text-green-400" />
              <span className="text-muted-foreground">Thắng:</span>{' '}
              <span className="font-medium text-green-600 dark:text-green-400">
                {formatMoney(betCode.potentialWinning || 0)}đ
              </span>
            </div>
          </div>

          {/* Numbers list */}
          {numbers.length > 0 && (
            <div className="mt-2 mb-1">
              <div className="flex items-center gap-1 mb-1">
                <Tag className="h-3 w-3 text-primary" />
                <span className="text-xs text-muted-foreground">
                  Số cược ({numbers.length}):
                </span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-16 overflow-y-auto pr-1">
                {numbers.map((number, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="font-medium bg-primary/10 text-primary border-primary/20 text-xs"
                  >
                    {number}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Details - only visible when expanded */}
          {showDetails && (
            <div className="mt-2 pt-2 border-t dark:border-gray-800 text-sm space-y-3">
              {betCode.lines && betCode.lines.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium text-xs flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    Chi tiết dòng:
                  </div>
                  <div className="grid gap-1.5 max-h-60 overflow-y-auto pr-1">
                    {betCode.lines.map((line, idx) => (
                      <div
                        key={idx}
                        className="bg-muted p-2 rounded-md text-xs grid grid-cols-2 gap-x-2 gap-y-0.5"
                      >
                        <div className="col-span-2 font-medium text-muted-foreground pb-1">
                          Dòng {idx + 1}: {line.originalLine}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Kiểu:</span>{' '}
                          <span className="font-medium">
                            {line.betType?.alias || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tiền:</span>{' '}
                          <span className="font-medium">
                            {formatMoney(line.amount || 0)}đ
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Số:</span>{' '}
                          <span className="font-medium">
                            {line.numbers?.join(', ') || 'N/A'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {betCode.formattedText &&
                betCode.formattedText !== betCode.originalText && (
                  <div>
                    <div className="font-medium text-xs flex items-center gap-1 mb-1">
                      <FileText className="h-3.5 w-3.5" />
                      Mã cược đã định dạng:
                    </div>
                    <pre className="bg-muted p-2 rounded-md text-xs overflow-x-auto whitespace-pre-wrap">
                      {betCode.formattedText}
                    </pre>
                  </div>
                )}
            </div>
          )}
        </CardContent>

        <CardFooter className="px-4 py-2 gap-2 flex-wrap border-t dark:border-gray-800">
          <Button
            variant="outline"
            size="sm"
            className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 dark:border-green-800"
            onClick={handleConfirmClick}
            disabled={isSavingDraftCode || isSaving}
          >
            {isSavingDraftCode || isSaving ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Xử lý
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenDetail}>
            <FileText className="h-3 w-3 mr-1" />
            Chi tiết
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto text-destructive hover:bg-destructive/10 border-destructive/20"
            onClick={handleRemove}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Xóa
          </Button>
        </CardFooter>
      </Card>

      {/* Modal dialog */}
      {isDetailOpen && (
        <BetCodeDetailModal
          betCode={betCode}
          isOpen={isDetailOpen}
          onClose={handleCloseDetail}
        />
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Xác nhận lưu mã cược
            </DialogTitle>
            <DialogDescription>
              Bạn đang lưu mã cược này vào hệ thống. Mã cược sau khi lưu sẽ được
              xóa khỏi danh sách nháp.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-3">
            <div className="text-sm font-medium">Chi tiết mã cược:</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Đài:</div>
              <div className="font-medium">{getStationDisplayName()}</div>
              <div className="text-muted-foreground">Tiền đóng:</div>
              <div className="font-medium text-blue-600">
                {formatMoney(betCode.stakeAmount || 0)}đ
              </div>
              <div className="text-muted-foreground">Tiềm năng thắng:</div>
              <div className="font-medium text-green-600">
                {formatMoney(betCode.potentialWinning || 0)}đ
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSavingDraftCode || isSaving}
            >
              Hủy
            </Button>
            <Button
              variant="default"
              onClick={handleConfirm}
              disabled={isSavingDraftCode || isSaving}
            >
              {isSavingDraftCode || isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Lưu mã cược
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BetCodeCard;
