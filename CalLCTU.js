include("DMM6500.js")
include("CalGeneral.js")
include("TestLCTU.js")

//---------Calibration setup parameters-------

// Callibration settings
//
cal_V_PulsePlate 	= 90 				// ms
cal_V_TriggerDelay	= 500e-6			// s
cal_Vmsr_Low 		= [200, 1301]		// V
cal_Vmsr_High 		= [1300, 3300]		// V
cal_Imsr_Low 		= 2					// mA
cal_Imsr_High 		= 30				// mA
cal_VmsrProbe 		= 500

// Calibration types
//
cal_Vm_R0			= 0
cal_Vm_R1			= 1
cal_Im				= 2
	
cal_CalibrationType = cal_Im

// Calibration points
//
cal_Points 			= 10
cal_Iterations 		= 5

// Load resistance
//
cal_Rload 			= 103				// kOhm
//------------------------------------------

// Counters
cal_CntTotal = 0;
cal_CntDone = 0;
//

// Variables
Setpoint = [];
Xmin = 0;
Xmax = 0;
Xstp = 0;

// Results storage
cal_I = [];
cal_V = [];

// Keithley data
cal_KEIData = [];
cal_Ikei = [];

// Relative error
cal_Err = [];
cal_SetErr = [];


function CAL_Calibrate_V()
{	
	CAL_V_Process(1)
}
//--------------------

function CAL_Verify_V()
{	
	CAL_V_Process(0)
}
//--------------------

function CAL_Calibrate_I()
{	
	CAL_I_Process(1)
}
//--------------------

function CAL_Verify_I()
{	
	CAL_I_Process(0)
}
//--------------------

function CAL_V_Process(Calibration)
{
		var SetpointArray
	
	// Reload values
	switch(cal_CalibrationType)
	{
		case cal_Vm_R0:
		case cal_Vm_R1:
			Xmin = cal_Vmsr_Low[cal_CalibrationType];
			Xmax = cal_Vmsr_High[cal_CalibrationType];
			break
			
		default:
			p("Wrong calibration type!")
			return
	}
	
	Xstp = (Xmax - Xmin) / cal_Points;
	SetpointArray = CGEN_GetRange(Xmin, Xmax, Xstp)
	
	CAL_ConfigDMM6500()

	CAL_ResetArrays()
	CAL_ResetCalibration(Calibration)
	
	if (CAL_Collect(SetpointArray, cal_Iterations))
	{
		CAL_Save()
		CAL_PlotGraph()
		CAL_CalculateCorrection(Calibration)
	}
}
//--------------------

function CAL_I_Process(Calibration)
{	
	var SetpointArray
	
	// Reload values
	switch(cal_CalibrationType)
	{
		case cal_Im:
			Xmin = cal_Imsr_Low * cal_Rload;
			Xmax = cal_Imsr_High * cal_Rload;
			
			if(Xmin < cal_Vmsr_Low[0] || Xmax > cal_Vmsr_High[1])
			{
				p("Wrong calibration parameters!")
				return
			}
		break
			
		default:
			p("Wrong calibration type!")
			return
	}
	
	Xstp = (Xmax - Xmin) / cal_Points;
	SetpointArray = CGEN_GetRange(Xmin, Xmax, Xstp)
	
	CAL_ConfigDMM6500()

	CAL_ResetArrays()
	CAL_ResetCalibration(Calibration)
	
	dev.w(44,1) // PAU emulate enable
	
	if (CAL_Collect(SetpointArray, cal_Iterations))
	{
		CAL_Save()
		CAL_PlotGraph()
		CAL_CalculateCorrection(Calibration)
	}
	
	dev.w(44,0) // PAU emulate disable
}
//--------------------

function CAL_Collect(SetpointValues, IterationsCount)
{
	cal_CntTotal = IterationsCount * SetpointValues.length;
	cal_CntDone = 1;
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < SetpointValues.length; j++)
		{
			print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --")
			//
			
			switch(cal_CalibrationType)
			{
				case cal_Vm_R0:
				case cal_Vm_R1:
					KEI_SetVoltageRange(SetpointValues[j] / cal_VmsrProbe * 1.2)
					break
								
				case cal_Im:
					KEI_SetCurrentRange(SetpointValues[j] / cal_Rload / 1000 * 1.2)
					break;
			}
			KEI_ActivateTrigger()
			sleep(500)
			
			switch(cal_CalibrationType)
			{
				case cal_Vm_R0:
				case cal_Vm_R1:
					LCTU_Start(SetpointValues[j], 100);
					
					print("Vset,     V: " + SetpointValues[j])
					break;
								
				case cal_Im:
					LCTU_Start(SetpointValues[j], 100);
					
					print("Vset,     V: " + SetpointValues[j])
					break;
			}
			sleep(500)
			
			// Setpoint
			Setpoint.push(SetpointValues[j])
			
			switch(cal_CalibrationType)
			{
				case cal_Vm_R0:
				case cal_Vm_R1:
					var KEIData = KEI_ReadAverage() * cal_VmsrProbe
					cal_KEIData.push(KEIData)
					print("KEI,     V: " + KEIData)
					
					var Uread = dev.rf(200)
					cal_V.push(Uread)
					print("Uread,   V: " + Uread)

					// Relative error
					var Uerr = ((Uread - KEIData) / KEIData * 100).toFixed(2)
					cal_Err.push(Uerr)
					print("Uerr,    %: " + Uerr)
					break
					
				case cal_Im:
					var KEIData = KEI_ReadAverage() * 1000;
					cal_KEIData.push(KEIData)
					print("KEI,     mA: " + KEIData)
					
					var Iread = dev.rf(201)
					cal_I.push(Iread)
					print("Iread,   mA: " + Iread)

					// Relative error
					var Ierr = ((Iread - KEIData) / KEIData * 100).toFixed(2)
					cal_Err.push(Ierr)
					print("Ierr,     %: " + Ierr)
					break;
			}			

			print("--------------------")
			
			if(anykey())
				return 0;
		}
	}

	return 1;
}
//--------------------

function CAL_PlotGraph()
{	
	switch(cal_CalibrationType)
	{
		case cal_Vm_R0:
		case cal_Vm_R1:
			scattern(cal_KEIData, cal_Err, "Voltage (in V)", "Error (in %)", "Voltage relative error")
			break
			
		case cal_Im:
			scattern(cal_KEIData, cal_Err, "Current (in mA)", "Error (in %)", "Current relative error")
			break;
	}
}
//--------------------

function CAL_CalculateCorrection(Calibration)
{	
	Reg = []
	cal_Corr = []
	
	if(Calibration)
	{
		switch(cal_CalibrationType)
		{
			case cal_Vm_R0:
				Reg = [2,3,4]			// [P2, P1, P0]
				cal_Corr = CGEN_GetCorrection2("LCTU_V")
				p('Voltage measurement coefficients, Range 0:')
				break
				
			case cal_Vm_R1:
				Reg = [7,8,9]			// [P2, P1, P0]
				cal_Corr = CGEN_GetCorrection2("LCTU_V")
				p('Voltage measurement coefficients, Range 1:')
				break
				
			case cal_Im:
				Reg = [12,13,14]		// [P2, P1, P0]
				cal_Corr = CGEN_GetCorrection2("LCTU_I")
				p('Current measurement coefficients:')
				break
		}
		
		CAL_SetCoef(Reg, cal_Corr)
		CAL_PrintCoef(Reg)
	}
}
//--------------------

function CAL_ResetCalibration(Calibration)
{	
	Reg = []
	Data = [0,1,0]
	
	if(Calibration)
	{
		switch(cal_CalibrationType)
		{
			case cal_Vm_R0:
				CAL_SetCoef([2,3,4], Data)	// [P2, P1, P0]		
				break
				
			case cal_Vm_R1:
				CAL_SetCoef([7,8,9], Data)	// [P2, P1, P0]	
				break
				
			case cal_Im:
				CAL_SetCoef([12,13,14], Data)	// [P2, P1, P0]	
				break
		}
	}
}
//--------------------

function CAL_SetCoef(Reg, Data)
{
	dev.wf(Reg[0], Data[0])
	dev.wf(Reg[1], Data[1])
	dev.wf(Reg[2], Data[2])
}
//--------------------

function CAL_PrintCoef(Reg)
{
	print("P2 : " + dev.rf(Reg[0]))
	print("P1 : " + dev.rf(Reg[1]))
	print("P0 : " + dev.rf(Reg[2]))
}
//--------------------

function CAL_Save()
{		
	switch(cal_CalibrationType)
	{
		case cal_Vm_R0:
		case cal_Vm_R1:
			CGEN_SaveArrays("LCTU_V", cal_V, cal_KEIData, cal_Err)
			break
			
		case cal_Im:
			CGEN_SaveArrays("LCTU_I", cal_I, cal_KEIData, cal_Err)
			break
	}
}
//--------------------

function CAL_ConfigDMM6500()
{
	KEI_Reset()
	
	switch(cal_CalibrationType)
	{
		case cal_Vm_R0:
		case cal_Vm_R1:
			KEI_ConfigVoltage(cal_V_PulsePlate * 1000)
			KEI_ConfigExtTrigger(cal_V_TriggerDelay)
			break
			
		case cal_Im:
			KEI_ConfigCurrent(cal_V_PulsePlate * 1000)
			KEI_ConfigExtTrigger(cal_V_TriggerDelay)
			break;
	}
}
//--------------------

function CAL_ResetArrays()
{	
	// Setpoint storage
	Setpoint = []
	
	// Results storage
	cal_V = []
	cal_I = []

	// Keithley data
	cal_KEIData = []
	cal_Ikei = []

	// Relative error
	cal_Err = []
	cal_SetErr = []

	// Correction
	cal_Corr = []
	cal_Icorr = []
}
//--------------------