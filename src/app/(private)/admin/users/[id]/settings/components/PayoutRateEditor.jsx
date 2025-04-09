// src/app/(private)/admin/users/[id]/settings/components/PayoutRateEditor.jsx
import React, { useEffect, useState } from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, Info, AlertTriangle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getPayoutRateLabel } from '@/components/bet-types/utils';

const PayoutRateEditor = ({
  form,
  isPending,
  onSubmitForm,
  originalPayoutRate,
  selectedBetType,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState('structured');
  const [hasParseError, setHasParseError] = useState(false);
  const [payoutStructure, setPayoutStructure] = useState([]);
  const [simpleRate, setSimpleRate] = useState('');
  const [isSimpleRate, setIsSimpleRate] = useState(false);

  // Parse payoutRate when selectedBetType changes
  useEffect(() => {
    if (!originalPayoutRate) return;

    try {
      let parsedValue;

      // If it's already a string, try to parse it as JSON
      if (typeof originalPayoutRate === 'string') {
        try {
          parsedValue = JSON.parse(originalPayoutRate);
        } catch (e) {
          // If not valid JSON, it might be a simple number
          if (!isNaN(originalPayoutRate)) {
            setIsSimpleRate(true);
            setSimpleRate(originalPayoutRate);
            form.setValue('payoutRate', originalPayoutRate);
          } else {
            setHasParseError(true);
          }
          return;
        }
      } else {
        parsedValue = originalPayoutRate;
      }

      // Check if it's a simple number
      if (typeof parsedValue === 'number') {
        setIsSimpleRate(true);
        setSimpleRate(parsedValue.toString());
        form.setValue('payoutRate', parsedValue.toString());
        return;
      }

      // Handle object structure
      if (typeof parsedValue === 'object') {
        setIsSimpleRate(false);
        const structure = Object.entries(parsedValue).map(([key, value]) => ({
          key,
          label: getPayoutRateLabel(key),
          value: value.toString(),
        }));
        setPayoutStructure(structure);

        // Ensure form has the latest JSON value
        form.setValue('payoutRate', JSON.stringify(parsedValue, null, 2));
      }

      setHasParseError(false);
    } catch (e) {
      console.error('Error parsing payout rate:', e);
      setHasParseError(true);
    }
  }, [originalPayoutRate, form, selectedBetType]);

  // Update JSON when structured fields change
  const updateJSONFromFields = (updatedFields) => {
    try {
      const jsonObject = {};
      updatedFields.forEach((field) => {
        // Only include fields with values
        if (field.value.trim() !== '') {
          // Convert to number if possible
          const numValue = parseFloat(field.value);
          jsonObject[field.key] = isNaN(numValue) ? field.value : numValue;
        }
      });

      form.setValue('payoutRate', JSON.stringify(jsonObject, null, 2));
    } catch (e) {
      console.error('Error updating JSON:', e);
    }
  };

  // Handle structured field changes
  const handleFieldChange = (index, value) => {
    const updatedStructure = [...payoutStructure];
    updatedStructure[index].value = value;
    setPayoutStructure(updatedStructure);
    updateJSONFromFields(updatedStructure);
  };

  // Handle simple rate change
  const handleSimpleRateChange = (value) => {
    setSimpleRate(value);
    form.setValue('payoutRate', value);
  };

  // Determine what fields to show based on bet type name
  const getBetTypeFields = () => {
    const name = selectedBetType?.name || '';

    // Default fields that apply to most bet types
    const commonFields = [
      { key: '2 digits', label: '2 chữ số' },
      { key: '3 digits', label: '3 chữ số' },
      { key: '4 digits', label: '4 chữ số' },
    ];

    // Fields for different regions
    const regionFields = [
      { key: 'north', label: 'Miền Bắc' },
      { key: 'central', label: 'Miền Trung' },
      { key: 'south', label: 'Miền Nam' },
    ];

    // Fields for bridge types
    const bridgeFields = [
      { key: 'bridgeOneStation', label: 'Đá 1 đài' },
      { key: 'bridgeTwoStations', label: 'Đá 2 đài' },
      { key: 'bridgeNorth', label: 'Đá Miền Bắc' },
    ];

    // Return appropriate fields based on bet type
    if (name.includes('Đá')) {
      return bridgeFields;
    } else if (payoutStructure.length > 0) {
      // If we've already parsed the structure, return that
      return payoutStructure;
    } else if (selectedBetType?.applicable_regions?.length > 0) {
      // If type applies to specific regions
      const regions = selectedBetType.applicable_regions;
      return regions.length > 1
        ? [
            ...commonFields,
            ...regionFields.filter((r) => regions.includes(r.key)),
          ]
        : commonFields;
    }

    return commonFields;
  };

  // Create fields dynamically based on bet type
  const renderDynamicFields = () => {
    if (isSimpleRate) {
      return (
        <div className="space-y-4">
          <FormItem>
            <FormLabel>Tỷ lệ trả thưởng (đơn giản)</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="Ví dụ: 75"
                value={simpleRate}
                onChange={(e) => handleSimpleRateChange(e.target.value)}
              />
            </FormControl>
            <p className="text-sm text-muted-foreground">
              Nhập giá trị tỷ lệ trả thưởng (1 ăn X)
            </p>
          </FormItem>
        </div>
      );
    }

    const fields = getBetTypeFields();

    return (
      <div className="space-y-4">
        {fields.map((field, index) => (
          <FormItem key={field.key}>
            <FormLabel>
              {field.label || getPayoutRateLabel(field.key)}
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder={`Ví dụ: 75`}
                value={field.value || ''}
                onChange={(e) => handleFieldChange(index, e.target.value)}
              />
            </FormControl>
          </FormItem>
        ))}
      </div>
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitForm)} className="space-y-4">
        <div className="grid w-full items-center gap-1.5 mb-4">
          <FormLabel>Loại cược</FormLabel>
          <Input value={selectedBetType?.name || ''} disabled />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="structured">Cấu trúc</TabsTrigger>
            <TabsTrigger value="raw">JSON gốc</TabsTrigger>
          </TabsList>

          <TabsContent value="structured" className="space-y-4">
            {hasParseError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Không thể phân tích cấu trúc tỷ lệ. Vui lòng sử dụng tab
                  &quot;JSON gốc&quot;.
                </AlertDescription>
              </Alert>
            )}

            {!hasParseError && renderDynamicFields()}
          </TabsContent>

          <TabsContent value="raw">
            <FormField
              control={form.control}
              name="payoutRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tỷ lệ trả thưởng (JSON)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder='{"2 digits": 75, "3 digits": 650, "4 digits": 5500}'
                      className="h-40 font-mono"
                    />
                  </FormControl>
                  <div className="text-xs text-amber-500 mt-1 flex items-start">
                    <Info className="h-3 w-3 mt-0.5 mr-1" />
                    <span>
                      Tỷ lệ trả thưởng cần nhập theo định dạng JSON. Có thể là
                      một giá trị đơn (VD: 75) hoặc một đối tượng phức tạp với
                      nhiều trường.
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        <div className="flex justify-end space-x-4">
          {/* Thêm nút hủy */}
          <Button type="button" variant="outline" onClick={onCancel}>
            Hủy
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              'Lưu thay đổi'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PayoutRateEditor;
