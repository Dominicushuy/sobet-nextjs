// src/components/bet/PrintBetCode.jsx
import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Printer,
  Download,
  CheckCircle2,
  FileText,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { exportBetCodeToPDF } from '@/services/export/pdfExporter'
import { toast } from 'sonner'
import { formatMoney } from '@/utils/formatters'

const PrintBetCode = ({ betCode, isOpen, onClose }) => {
  const [printing, setPrinting] = useState(false)
  const [activeTab, setActiveTab] = useState('preview')
  const [isGenerating, setIsGenerating] = useState(false)

  const handlePrint = async () => {
    if (!betCode) return

    try {
      setPrinting(true)
      setIsGenerating(true)
      const pdfBlob = await exportBetCodeToPDF(betCode)

      // Create a download link and trigger download
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `MaCuoc_${betCode.id?.substring(0, 8) || 'unknown'}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Free the URL object
      setTimeout(() => URL.revokeObjectURL(url), 100)

      toast.success('Đã tạo PDF thành công!')
      setIsGenerating(false)
    } catch (error) {
      console.error('Lỗi khi in mã cược:', error)
      toast.error('Lỗi khi tạo PDF: ' + error.message)
      setIsGenerating(false)
    } finally {
      setTimeout(() => setPrinting(false), 500) // Small delay to prevent UI flicker
    }
  }

  if (!betCode) return null

  const formattedDate = betCode.createdAt
    ? format(new Date(betCode.createdAt), 'HH:mm:ss dd/MM/yyyy')
    : 'N/A'

  // Get station display name
  const getStationDisplayName = () => {
    if (!betCode.station) return 'Đài không xác định'

    let displayName = betCode.station.name || 'Đài không xác định'

    if (betCode.station.multiStation && betCode.station.count > 1) {
      displayName = `${displayName} (${betCode.station.count})`
    }

    if (betCode.station.stations && betCode.station.stations.length > 0) {
      // Sử dụng Set để đảm bảo tên đài không bị trùng lặp
      const uniqueStations = [
        ...new Set(betCode.station.stations.map((s) => s.name)),
      ].join(', ')
      displayName = uniqueStations
    }

    return displayName
  }

  // Get original stake amount directly from the bet code
  const getOriginalStakeAmount = () => {
    if (!betCode.lines || !Array.isArray(betCode.lines)) return 0

    // console.log('Bet code lines:', betCode.lines)

    // Sum up the original amount from all lines
    return betCode.lines.reduce((total, line) => {
      // Original amount in bet code is the base amount × 1000
      return total + (line.amount || 0)
    }, 0)
  }

  // Get all numbers from all lines
  const getAllNumbers = () => {
    if (!betCode.lines || !Array.isArray(betCode.lines)) return []

    const allNumbers = []
    betCode.lines.forEach((line) => {
      if (line.numbers && Array.isArray(line.numbers)) {
        allNumbers.push(...line.numbers)
      }
    })

    return [...new Set(allNumbers)] // Remove duplicates
  }

  const numbers = getAllNumbers()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Printer className='h-5 w-5 text-primary' />
            In mã cược
          </DialogTitle>
        </DialogHeader>

        <div className='border rounded-md p-6 mb-4 bg-white'>
          <div className='text-center mb-6'>
            <h2 className='text-xl font-bold uppercase tracking-wide'>
              PHIẾU MÃ CƯỢC
            </h2>
            <div className='flex justify-between text-xs mt-3 text-gray-600'>
              <div>Mã phiếu: {betCode.id?.substring(0, 8) || 'N/A'}</div>
              <div>Ngày tạo: {formattedDate}</div>
            </div>
          </div>

          <div className='mb-6 space-y-4'>
            <div className='border-b pb-4'>
              <h3 className='text-sm font-semibold mb-3 flex items-center gap-1.5'>
                <FileText className='h-3.5 w-3.5' />
                Thông tin chung
              </h3>
              <div className='grid grid-cols-2 gap-x-4 gap-y-2 text-sm'>
                <div>
                  <span className='font-medium'>Đài:</span>{' '}
                  {getStationDisplayName()}
                </div>
                <div>
                  <span className='font-medium'>Số lượng dòng:</span>{' '}
                  {betCode.lines?.length || 0}
                </div>
                <div>
                  <span className='font-medium'>Tiền đặt:</span>{' '}
                  {formatMoney(getOriginalStakeAmount())}đ
                </div>
                <div>
                  <span className='font-medium'>Tiền đóng:</span>{' '}
                  {formatMoney(betCode.stakeAmount || 0)}đ
                </div>
                <div className='col-span-2'>
                  <span className='font-medium'>Tiềm năng thắng:</span>{' '}
                  <span className='text-green-700'>
                    {formatMoney(betCode.potentialWinning || 0)}đ
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className='mb-6'>
            <h3 className='text-sm font-semibold mb-3'>
              Chi tiết các dòng cược:
            </h3>
            <table className='w-full text-xs border-collapse'>
              <thead>
                <tr className='bg-gray-100'>
                  <th className='p-2 text-left font-medium'>STT</th>
                  <th className='p-2 text-left font-medium'>Số cược</th>
                  <th className='p-2 text-left font-medium'>Kiểu</th>
                  <th className='p-2 text-right font-medium'>Tiền cược</th>
                  <th className='p-2 text-right font-medium'>Tiềm năng</th>
                </tr>
              </thead>
              <tbody>
                {betCode.lines &&
                  betCode.lines.map((line, index) => (
                    <tr key={index} className='border-b'>
                      <td className='p-2'>{index + 1}</td>
                      <td className='p-2'>
                        {line.numbers?.join(', ') || 'N/A'}
                      </td>
                      <td className='p-2'>{line.betType?.alias || 'N/A'}</td>
                      <td className='p-2 text-right'>
                        {formatMoney(line.amount || 0)}đ
                      </td>
                      <td className='p-2 text-right'>
                        {formatMoney(
                          line.amount *
                            (getBetTypeRate(line.betType?.alias) || 75)
                        )}
                        đ
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className='my-6 p-3 bg-gray-50 rounded-md'>
            <h3 className='text-sm font-semibold mb-2'>Mã cược:</h3>
            <pre className='text-xs bg-white p-2 rounded border whitespace-pre-wrap break-all'>
              {betCode.formattedText || betCode.originalText || ''}
            </pre>
          </div>
        </div>

        <DialogFooter className='flex justify-between'>
          <div>
            <Button
              variant='outline'
              size='sm'
              onClick={() =>
                setActiveTab(activeTab === 'preview' ? 'details' : 'preview')
              }
              className='mr-2'>
              <FileText className='h-3.5 w-3.5 mr-1.5' />
              {activeTab === 'preview' ? 'Xem chi tiết' : 'Xem trước'}
            </Button>
          </div>

          <div>
            <Button
              variant='outline'
              size='sm'
              onClick={onClose}
              className='mr-2'>
              Đóng
            </Button>

            <Button onClick={handlePrint} disabled={printing} size='sm'>
              {printing ? (
                <>
                  {isGenerating ? (
                    <span className='flex items-center'>
                      <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' />
                      Đang tạo...
                    </span>
                  ) : (
                    <span className='flex items-center'>
                      <CheckCircle2 className='h-3.5 w-3.5 mr-1.5' />
                      Đã tạo xong
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Download className='h-3.5 w-3.5 mr-1.5' />
                  Tải PDF
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Hàm này trả về tỉ lệ thắng cược dựa vào kiểu cược
 */
function getBetTypeRate(betType) {
  if (!betType) return 75 // Default

  // Tỉ lệ thắng cược cơ bản
  const rates = {
    dd: 75, // Đầu đuôi
    b: 75, // Bao lô (2 chữ số)
    bao: 75,
    xc: 650, // Xỉu chủ
    x: 650,
    dau: 75, // Đầu
    duoi: 75, // Đuôi
    dui: 75,
    da: 750, // Đá
    dv: 750,
    xien: 350, // Xiên (2 số)
    xienmb: 350,
    nt: 75, // Nhất to
    nto: 75,
    b7l: 75, // Bao lô 7
    baobay: 75,
    b8l: 75, // Bao lô 8
    baotam: 75,
  }

  return rates[betType.toLowerCase()] || 75
}

export default PrintBetCode
