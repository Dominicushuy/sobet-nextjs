import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle2,
  Trash2,
  FileText,
  Clock,
  Info,
  Calculator,
  DollarSign,
  Award,
  Building,
  Hash,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatMoney } from '@/utils/formatters';
import { useBetCode } from '@/contexts/BetCodeContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const BetCodeDetailModal = ({ betCode, isOpen, onClose }) => {
  const { confirmDraftCode, removeDraftCode } = useBetCode();

  const [activeTab, setActiveTab] = useState('general');

  if (!betCode) return null;

  const formattedDate = betCode.createdAt
    ? format(new Date(betCode.createdAt), 'HH:mm:ss dd/MM/yyyy')
    : 'N/A';

  const handleConfirm = () => {
    confirmDraftCode(betCode.id);
    toast.success('Đã xử lý mã cược');
    onClose();
  };

  const handleDelete = () => {
    removeDraftCode(betCode.id);
    toast.success('Đã xóa mã cược');
    onClose();
  };

  const mapRegionName = (region) => {
    const regionMap = {
      north: 'Miền Bắc',
      central: 'Miền Trung',
      south: 'Miền Nam',
    };
    return regionMap[region] || region || 'Không xác định';
  };

  // Get original stake amount directly from bet code
  const getOriginalStakeAmount = () => {
    if (!betCode.lines || !Array.isArray(betCode.lines)) return 0;

    // Sum up the original amount from all lines (amount in thousands)
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
        allNumbers.push(...line.numbers);
      }
    });

    return allNumbers; // Remove duplicates
  };

  const numbers = getAllNumbers();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Chi tiết mã cược
            <Badge
              variant="outline"
              className="ml-2 bg-primary/10 text-primary border-primary/20"
            >
              Mã cược
            </Badge>
          </DialogTitle>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formattedDate}
            <span className="mx-1">•</span>
            <span className="font-medium text-primary">
              {betCode.id?.substring(0, 8) || 'N/A'}
            </span>
          </div>
        </DialogHeader>

        <Tabs
          defaultValue="general"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="general" className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Thông tin chung
            </TabsTrigger>
            <TabsTrigger
              value="calculation"
              className="flex items-center gap-1.5"
            >
              <Calculator className="h-3.5 w-3.5" />
              Tính toán
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardContent className="p-6 space-y-5">
                {/* Basic info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium flex items-center gap-1.5">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      Thông tin đài
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <div className="text-muted-foreground">Đài:</div>
                        <div className="font-medium">
                          {betCode.station?.name || 'Không xác định'}
                        </div>
                      </div>

                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <div className="text-muted-foreground">Vùng:</div>
                        <div className="font-medium">
                          {mapRegionName(betCode.station?.region)}
                        </div>
                      </div>

                      {betCode.station?.multiStation && (
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <div className="text-muted-foreground">
                            Số lượng đài:
                          </div>
                          <div className="font-medium">
                            {betCode.station.count || 1}
                          </div>
                        </div>
                      )}

                      {betCode.station?.stations && (
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <div className="text-muted-foreground">
                            Danh sách đài:
                          </div>
                          <div className="font-medium">
                            {betCode.station.stations
                              .map((s) => s.name)
                              .join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-medium flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Trạng thái
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <div className="text-muted-foreground">Trạng thái:</div>
                        <div className="font-medium">Đang xử lý</div>
                      </div>

                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <div className="text-muted-foreground">Số mã cược:</div>
                        <div className="font-medium">
                          {betCode.lines?.length || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Money summary */}
                <div className="grid grid-cols-3 gap-4 py-2">
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" />
                      Tiền đặt
                    </div>
                    <div className="text-lg font-semibold">
                      {formatMoney(getOriginalStakeAmount())}đ
                    </div>
                  </div>

                  <div className="bg-primary/10 p-3 rounded-lg">
                    <div className="text-sm text-primary mb-1 flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" />
                      Tiền đóng
                    </div>
                    <div className="text-lg font-semibold text-primary">
                      {formatMoney(betCode.stakeAmount || 0)}đ
                    </div>
                  </div>

                  <div className="bg-green-50 p-3 rounded-lg dark:bg-green-900/30">
                    <div className="text-sm text-green-700 dark:text-green-400 mb-1 flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5" />
                      Tiềm năng thắng
                    </div>
                    <div className="text-lg font-semibold text-green-700 dark:text-green-400">
                      {formatMoney(betCode.potentialWinning || 0)}đ
                    </div>
                  </div>
                </div>

                {/* Numbers list */}
                {numbers.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium flex items-center gap-1.5">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      Tất cả số cược ({numbers.length})
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {numbers.map((number, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="font-medium bg-primary/10 text-primary border-primary/20"
                        >
                          {number}
                        </Badge>
                      ))}
                    </div>

                    {/* Display permutations if available */}
                    {betCode.lines &&
                      betCode.lines.some((line) => line.isPermutation) && (
                        <div className="mt-4 pt-3 border-t dark:border-gray-800">
                          <h3 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                            <Hash className="h-4 w-4 text-green-600 dark:text-green-400" />
                            Các hoán vị đối với kiểu đảo
                          </h3>
                          <div className="space-y-3">
                            {betCode.lines
                              .filter((line) => line.isPermutation)
                              .map((line, lineIdx) => (
                                <div
                                  key={lineIdx}
                                  className="bg-green-50 p-3 rounded-md border border-green-100 dark:bg-green-900/30 dark:border-green-900"
                                >
                                  <div className="text-sm font-medium mb-2 text-green-800 dark:text-green-400">
                                    {line.betType?.alias || 'N/A'}
                                  </div>
                                  {line.numbers &&
                                    line.numbers.map((number, numIdx) => {
                                      // Get permutations for this number
                                      const perms =
                                        line.permutations &&
                                        line.permutations[number]
                                          ? line.permutations[number]
                                          : betCode.permutations &&
                                              betCode.permutations[number]
                                            ? betCode.permutations[number]
                                            : [];

                                      return (
                                        <div key={numIdx} className="mb-2">
                                          <div className="flex items-center gap-1.5 text-sm">
                                            <span className="font-medium">
                                              Số gốc:
                                            </span>
                                            <Badge className="bg-primary/10 text-primary border-primary/20">
                                              {number}
                                            </Badge>
                                            <span className="text-muted-foreground">
                                              {perms.length > 0 &&
                                                `(${perms.length} hoán vị)`}
                                            </span>
                                          </div>
                                          {perms.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1.5 ml-3">
                                              {perms.map((perm, permIdx) => (
                                                <Badge
                                                  key={permIdx}
                                                  variant="outline"
                                                  className={`text-xs ${
                                                    perm === number
                                                      ? 'bg-primary/10 text-primary border-primary/20'
                                                      : 'bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-400 dark:border-green-800'
                                                  }`}
                                                >
                                                  {perm}
                                                </Badge>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Original bet code */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Mã cược gốc
                  </h3>
                  <pre className="bg-muted p-3 rounded-lg text-xs whitespace-pre-wrap break-all">
                    {betCode.originalText || 'N/A'}
                  </pre>
                </div>

                {betCode.formattedText &&
                  betCode.formattedText !== betCode.originalText && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Mã cược đã định dạng
                      </h3>
                      <pre className="bg-muted p-3 rounded-lg text-xs whitespace-pre-wrap break-all">
                        {betCode.formattedText}
                      </pre>
                    </div>
                  )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calculation">
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium flex items-center gap-1.5">
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                    Tóm tắt tính toán
                  </h3>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Tiền đặt gốc:
                        </span>{' '}
                        <span className="font-medium">
                          {formatMoney(getOriginalStakeAmount())}đ
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Tiền đóng thực tế:
                        </span>{' '}
                        <span className="font-medium text-primary">
                          {formatMoney(betCode.stakeAmount || 0)}đ
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Hệ số nhân:
                        </span>{' '}
                        <span className="font-medium">0.8</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Tiềm năng thắng:
                        </span>{' '}
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {formatMoney(betCode.potentialWinning || 0)}đ
                        </span>
                      </div>
                      <div className="col-span-2 mt-1 pt-2 border-t border-muted-foreground/20">
                        <span className="text-muted-foreground">
                          Tỉ lệ thắng trên vốn:
                        </span>{' '}
                        <span className="font-medium text-amber-600 dark:text-amber-400">
                          {betCode.stakeAmount
                            ? (
                                betCode.potentialWinning / betCode.stakeAmount
                              ).toFixed(2) + 'x'
                            : '0x'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {betCode.stakeDetails && betCode.stakeDetails.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-primary" />
                      Chi tiết tính tiền đặt
                    </h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {betCode.stakeDetails.map((detail, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-primary/5 border border-primary/10 rounded-lg text-sm"
                        >
                          <div className="font-medium pb-2 text-primary/90">
                            {detail.betTypeAlias || 'N/A'}
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div>
                              <span className="text-primary/80">Số đài:</span>{' '}
                              <span className="font-medium">
                                {detail.stationCount || 1}
                              </span>
                            </div>

                            {detail.numberCount && (
                              <div>
                                <span className="text-primary/80">
                                  Số lượng số:
                                </span>{' '}
                                <span className="font-medium">
                                  {detail.numberCount}
                                </span>
                              </div>
                            )}

                            {detail.combinationCount && (
                              <div>
                                <span className="text-primary/80">Tổ hợp:</span>{' '}
                                <span className="font-medium">
                                  {detail.combinationCount}
                                </span>
                              </div>
                            )}

                            <div>
                              <span className="text-primary/80">
                                Tiền cược:
                              </span>{' '}
                              <span className="font-medium">
                                {formatMoney(detail.betAmount || 0)}đ
                              </span>
                            </div>

                            <div>
                              <span className="text-primary/80">Hệ số:</span>{' '}
                              <span className="font-medium">
                                {detail.betMultiplier || 0.8}
                              </span>
                            </div>
                          </div>

                          <div className="bg-primary/10 p-2 rounded text-xs">
                            <span className="text-primary/80">Công thức:</span>{' '}
                            <code className="font-mono">
                              {detail.formula || 'N/A'}
                            </code>
                          </div>

                          <div className="mt-2 font-medium text-primary/90">
                            <span>Kết quả:</span>{' '}
                            {formatMoney(detail.stake || 0)}đ
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {betCode.prizeDetails && betCode.prizeDetails.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Chi tiết tiềm năng thắng
                    </h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {betCode.prizeDetails.map((detail, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-green-50 border border-green-100 rounded-lg text-sm dark:bg-green-900/30 dark:border-green-900"
                        >
                          <div className="font-medium pb-2 text-green-800 dark:text-green-400">
                            {detail.betTypeAlias || 'N/A'}
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div>
                              <span className="text-green-700 dark:text-green-500">
                                Số đài:
                              </span>{' '}
                              <span className="font-medium">
                                {detail.stationCount || 1}
                              </span>
                            </div>

                            {detail.numberCount && (
                              <div>
                                <span className="text-green-700 dark:text-green-500">
                                  Số lượng số:
                                </span>{' '}
                                <span className="font-medium">
                                  {detail.numberCount}
                                </span>
                              </div>
                            )}

                            <div>
                              <span className="text-green-700 dark:text-green-500">
                                Tiền cược:
                              </span>{' '}
                              <span className="font-medium">
                                {formatMoney(detail.betAmount || 0)}đ
                              </span>
                            </div>

                            <div>
                              <span className="text-green-700 dark:text-green-500">
                                Tỉ lệ thắng:
                              </span>{' '}
                              <span className="font-medium">
                                {detail.payoutRate || 0}
                              </span>
                            </div>
                          </div>

                          <div className="bg-green-100 p-2 rounded text-xs dark:bg-green-900/50">
                            <span className="text-green-700 dark:text-green-500">
                              Công thức:
                            </span>{' '}
                            <code className="font-mono">
                              {detail.formula || 'N/A'}
                            </code>
                          </div>

                          <div className="mt-2 font-medium text-green-800 dark:text-green-400">
                            <span>Tiềm năng thắng:</span>{' '}
                            {formatMoney(detail.potentialPrize || 0)}đ
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 dark:border-green-800"
            onClick={handleConfirm}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Xử lý
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 border-destructive/20"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Xóa
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className={cn('ml-auto', activeTab !== 'general' && 'bg-muted')}
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BetCodeDetailModal;
