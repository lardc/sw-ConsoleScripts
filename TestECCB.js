include('PrintStatus.js')
include('Common.js')

function ECCB_ReadReg(NodeID, Reg)
{
	dev.w(185, NodeID)
	dev.w(186, Reg)
	dev.c(10)
	
	if (dev.r(223) == 0)
		return dev.r(224)
	else
	{
		print('Err code: ' + dev.r(223))
		return 0
	}
}

function ECCB_ReadRegS(NodeID, Reg)
{
	dev.w(185, NodeID)
	dev.w(186, Reg)
	dev.c(10)
	
	if (dev.r(223) == 0)
		return dev.rs(224)
	else
	{
		print('Err code: ' + dev.r(223))
		return 0
	}
}

function ECCB_ReadReg32d(NodeID, RegL, RegH)
{
	var result = 0
	
	dev.w(185, NodeID)
	dev.w(186, RegL)
	dev.c(10)
	
	if (dev.r(223) == 0)
	{
		result |= dev.r(224)
	}
	else
	{
		print('Read low part error.')
		print('Err code: ' + dev.r(223))
		return
	}
	
	dev.w(186, RegH)
	dev.c(10)
	
	if (dev.r(223) == 0)
	{
		result |= dev.r(224) << 16
	}
	else
	{
		print('Read high part error.')
		print('Err code: ' + dev.r(223))
	}
	
	return result
}

function ECCB_ReadReg32(NodeID, RegL)
{
	return ECCB_ReadReg32d(NodeID, RegL, RegL + 1)
}

function ECCB_WriteReg(NodeID, Reg, Value)
{
	dev.w(185, NodeID)
	dev.w(186, Reg)
	dev.w(187, Value)
	dev.c(11)
	
	if (dev.r(223) != 0)
		print('Err code: ' + dev.r(223))
}

function ECCB_WriteRegS(NodeID, Reg, Value)
{
	dev.w(185, NodeID)
	dev.w(186, Reg)
	dev.ws(187, Value)
	dev.c(11)
	
	if (dev.r(223) != 0)
		print('Err code: ' + dev.r(223))
}

function ECCB_WriteReg32d(NodeID, RegL, RegH, Value)
{
	dev.w(185, NodeID)
	dev.w(186, RegL)
	dev.w(187, Value & 0xffff)
	dev.c(11)
	
	if (dev.r(223) != 0)
	{
		print('Write low part error.')
		print('Err code: ' + dev.r(223))
		return
	}
	
	dev.w(186, RegH)
	dev.w(187, (Value >> 16) & 0xffff)
	dev.c(11)
	
	if (dev.r(223) != 0)
	{
		print('Write high part error.')
		print('Err code: ' + dev.r(223))
	}
}

function ECCB_WriteReg32(NodeID, RegL, Value)
{
	ECCB_WriteReg32d(NodeID, RegL, RegL + 1, Value)
}

function ECCB_Call(NodeID, Action)
{
	dev.w(185, NodeID)
	dev.w(186, Action)
	dev.c(12)
	
	if (dev.r(223) != 0)
		print('Err code: ' + dev.r(223))
}

function ECCB_ReadArray(NodeID, EndPoint)
{
	dev.w(185, NodeID)
	dev.w(186, EndPoint)
	dev.c(13)
	
	if (dev.r(223) != 0)
	{
		print('Err code: ' + dev.r(223))
		return []
	}
	else
		return dev.rafs(1)
}

function ECCB_Status()
{
	PrintStatus()
	print('---------')
	print('OpResult:		' + dev.r(197))
	print('Device substate:	' + dev.r(220))
	print('Failed substate:	' + dev.r(221))
	print('Config err code:	' + dev.r(222))
	print('[Interface status]')
	print('Device: 		' + dev.r(226))
	print('Function: 		' + dev.r(227))
	print('Error: 			' + dev.r(225))
	print('ExtData:		' + dev.r(228))
	print('Details:		' + dev.r(229))
}

function ECCB_NodeStatus(Node)
{
	print('Registers [192 - 197]')
	print('Device state:	' + ECCB_ReadReg(Node, 192))
	print('Fault reason:	' + ECCB_ReadReg(Node, 193))
	print('Disable reason:	' + ECCB_ReadReg(Node, 194))
	print('Warning:	' + ECCB_ReadReg(Node, 195))
	print('Problem:	' + ECCB_ReadReg(Node, 196))
	print('OpResult:	' + ECCB_ReadReg(Node, 197))
	print('Sub state:	' + ECCB_ReadReg(Node, 198))
}

function ECCB_Plot(Node, EndPoint)
{
	pl(ECCB_ReadArray(Node, EndPoint))
}

function ECCB_PrintSettings()
{
	ECCB_PrintNodeSetting('multiplexer', 0)
	ECCB_PrintNodeSetting('dc_current',  1)
	ECCB_PrintNodeSetting('dc_high_volt',2)
	ECCB_PrintNodeSetting('dc_voltage1', 3)
	ECCB_PrintNodeSetting('dc_voltage2', 4)
	ECCB_PrintNodeSetting('dc_voltage3', 5)
	ECCB_PrintNodeSetting('ac_voltage1', 6)
	ECCB_PrintNodeSetting('ac_voltage2', 7)
}

function ECCB_PrintNodeSetting(Name, Index)
{
	p(Name + ',\tnid[' + Index + ']: ' + dev.r(Index) + ',\tem[' + (Index + 10) + ']: ' + dev.r(Index + 10))
}

function ECCB_EmulationAll(NewState)
{
	for (var i = 10; i <= 17; i++)
		dev.w(i, NewState ? 1 : 0)
}

function ECCB_ExecAndWait(Command)
{
	dev.c(Command)
	
	while(dev.r(192) == 4 && !anykey())
		sleep(100)
}

function ECCB_Config(CaseType, Position, ControlType, ControlVoltage, ControlCurrent)
{
	// A1 = 1,
	// I1 = 2,
	// I6 = 3,
	// B1 = 4,
	// B2 = 5,
	// B3 = 6,
	// B5 = 7,
	// V1 = 8,
	// V2 = 9,
	// V108 = 10,
	// L1 = 11,
	// L2 = 12,
	// D1 = 13,
	// D2 = 14,
	// D192 = 15,
	// V104 = 16
	dev.w(129, CaseType)
	dev.w(130, Position)
	
	// 1 - IDC, 2 - VDC, 3 - VAC
	dev.w(131, ControlType)
	
	w32d(132, 150, ControlVoltage)
	w32d(133, 151, ControlCurrent)
}

function ECCB_ConfigPS(VoltagePS1, CurrentPS1, VoltagePS2, CurrentPS2)
{
	w32d(140, 154, VoltagePS1)
	w32d(141, 155, CurrentPS1)
	
	w32d(142, 156, VoltagePS2)
	w32d(143, 157, CurrentPS2)
}

function ECCB_PrintCommon()
{
	if(dev.r(192) == 3)
	{
		if(dev.r(197) == 1)
		{
			p('Vctrl:\t' + (r32d(201, 233) / 1000))
			p('Ictrl:\t' + (r32d(200, 232) / 1000) + '\n')
			
			p('Vps1:\t' + (r32(244) / 1000))
			p('Ips1:\t' + (r32d(203, 235) / 1000) + '\n')
			
			p('Vps2:\t' + (r32(246) / 1000))
			p('Ips2:\t' + (r32d(204, 236) / 1000) + '\n')
			
			return true
		}
		else
			p('Bad operation result')
	}
	else
		p('Wrong state: ' + dev.r(192))
	
	return false
}

function ECCB_Leak(Voltage, Current, LeakageType)
{
	dev.w(128, 1)
	
	// 1 - DC, 2 - AC
	dev.w(134, LeakageType)
	
	w32d(139, 153, Voltage)
	w32d(138, 152, Current)
	
	ECCB_ExecAndWait(100)
	
	if(ECCB_PrintCommon())
	{
		p('Vd:\t' + (r32(206) / 1000))
		p('Id:\t' + (r32d(198, 230) / 1000))
	}
}

function ECCB_OnState(Voltage, Current)
{
	dev.w(128, 2)
	
	w32d(139, 153, Voltage)
	w32d(138, 152, Current)
	
	ECCB_ExecAndWait(100)
	
	if(ECCB_PrintCommon())
	{
		p('Vt:\t' + (r32d(199, 231) / 1000))
		p('It:\t' + (r32(208) / 1000))
	}
}

function ECCB_Res(Voltage, Current)
{
	dev.w(128, 2)
	dev.w(144, 1)
	
	w32d(139, 153, Voltage)
	w32d(138, 152, Current)
	
	ECCB_ExecAndWait(100)
	
	if(ECCB_PrintCommon())
		p('R:\t' + (r32d(205, 237) / 1000))
	
	dev.w(144, 0)
}

function ECCB_Control(Voltage, Current)
{
	var Override = Voltage && Current
	var VoltageCopy, CurrentCopy
	
	if(Override)
	{
		VoltageCopy = r32d(132, 150)
		CurrentCopy = r32d(133, 151)
		
		w32d(132, 150, Voltage)
		w32d(133, 151, Current)
	}
	
	dev.w(128, 3)
	
	ECCB_ExecAndWait(100)
	
	ECCB_PrintCommon()
	
	if(Override)
	{
		w32d(132, 150, VoltageCopy)
		w32d(133, 151, CurrentCopy)
	}
}

function ECCB_Calibrate(Voltage, Current, Type, Node)
{
	// CN_DC1 = 1
	// CN_DC2 = 2
	// CN_DC3 = 3
	// CN_AC1 = 4
	// CN_AC2 = 5
	// CN_HVDC = 6
	// CN_CB = 7
	dev.w(160, Node)
	
	// 1 - Current, 2 - Voltage
	dev.w(161, Type)
	
	w32(162, Voltage)
	w32(164, Current)
	
	ECCB_ExecAndWait(104)
	
	if(ECCB_PrintCommon())
	{
		p('Vcal:\t' + (r32(240) / 1000))
		p('Ical:\t' + (r32(242) / 1000))
	}
}
