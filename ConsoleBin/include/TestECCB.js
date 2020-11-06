include('PrintStatus.js')
include('Common.js')

function ECCB_ReadReg(NodeID, Reg)
{
	dev.w(185, NodeID)
	dev.w(186, Reg)
	dev.c(10)
	
	if (dev.r(222) == 0)
		return dev.r(223)
	else
	{
		print('Err code: ' + dev.r(222))
		return 0
	}
}

function ECCB_ReadRegS(NodeID, Reg)
{
	dev.w(185, NodeID)
	dev.w(186, Reg)
	dev.c(10)
	
	if (dev.r(222) == 0)
		return dev.rs(223)
	else
	{
		print('Err code: ' + dev.r(222))
		return 0
	}
}

function ECCB_ReadReg32d(NodeID, RegL, RegH)
{
	var result = 0
	
	dev.w(185, NodeID)
	dev.w(186, RegL)
	dev.c(10)
	
	if (dev.r(222) == 0)
	{
		result |= dev.r(223)
	}
	else
	{
		print('Read low part error.')
		print('Err code: ' + dev.r(222))
		return
	}
	
	dev.w(186, RegH)
	dev.c(10)
	
	if (dev.r(222) == 0)
	{
		result |= dev.r(223) << 16
	}
	else
	{
		print('Read high part error.')
		print('Err code: ' + dev.r(222))
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
	
	if (dev.r(222) != 0)
		print('Err code: ' + dev.r(222))
}

function ECCB_WriteRegS(NodeID, Reg, Value)
{
	dev.w(185, NodeID)
	dev.w(186, Reg)
	dev.ws(187, Value)
	dev.c(11)
	
	if (dev.r(222) != 0)
		print('Err code: ' + dev.r(222))
}

function ECCB_WriteReg32d(NodeID, RegL, RegH, Value)
{
	dev.w(185, NodeID)
	dev.w(186, RegL)
	dev.w(187, Value & 0xffff)
	dev.c(11)
	
	if (dev.r(222) != 0)
	{
		print('Write low part error.')
		print('Err code: ' + dev.r(222))
		return
	}
	
	dev.w(186, RegH)
	dev.w(187, (Value >> 16) & 0xffff)
	dev.c(11)
	
	if (dev.r(222) != 0)
	{
		print('Write high part error.')
		print('Err code: ' + dev.r(222))
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
	
	if (dev.r(222) != 0)
		print('Err code: ' + dev.r(222))
}

function ECCB_ReadArray(NodeID, EndPoint)
{
	dev.w(185, NodeID)
	dev.w(186, EndPoint)
	dev.c(13)
	
	if (dev.r(222) != 0)
	{
		print('Err code: ' + dev.r(222))
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
	print('Config err code:	' + dev.r(221))
	print('[Interface status]')
	print('Device: 		' + dev.r(226))
	print('Function: 		' + dev.r(227))
	print('Error: 			' + dev.r(225))
	print('ExtData:		' + dev.r(228))
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

function ECCBM_OnState(Voltage, Current, ControlVoltage, ControlCurrent, ControlMode)
{
	dev.w(128, 2)
	
	// 1 - IDC, 2 - VDC, 3 - VAC
	dev.w(131, ControlMode)
	
	w32d(132, 150, ControlVoltage)
	w32d(133, 151, ControlCurrent)
	
	w32d(139, 153, Voltage)
	w32d(138, 152, Current)
	
	dev.c(100)
	
	while(dev.r(192) == 4)
		sleep(100)
	
	if(dev.r(192) == 3)
	{
		p('Vt :\t' + r32d(199, 231))
		p('It :\t' + r32(208))
		p('Vctrl :\t' + r32d(201, 233))
		p('Ictrl :\t' + r32d(200, 232))
	}
	else
		p('Wrong state: ' + dev.r(192))
}

function ECCBM_Leak(Voltage, Current, ControlVoltage, ControlCurrent, ControlMode, LeakMode)
{
	dev.w(128, 1)
	
	// 1 - IDC, 2 - VDC, 3 - VAC
	dev.w(131, ControlMode)
	
	w32d(132, 150, ControlVoltage)
	w32d(133, 151, ControlCurrent)
	
	// 1 - DC, 2 - Action
	dev.w(134, LeakMode)
	
	w32d(139, 153, Voltage)
	w32d(138, 152, Current)
	
	dev.c(100)
	
	while(dev.r(192) == 4)
		sleep(100)
	
	if(dev.r(192) == 3)
	{
		p('Vd :\t' + r32d(199, 231))
		p('Id :\t' + r32(208))
		p('Vctrl :\t' + r32d(201, 233))
		p('Ictrl :\t' + r32d(200, 232))
	}
	else
		p('Wrong state: ' + dev.r(192))
}